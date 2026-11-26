import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Db } from "mongodb";
import { GET as statsGet } from "../app/api/admin/stats/route";
import {
  createAdminSessionToken,
  serializeAdminSessionCookie,
} from "../lib/admin/auth/session";
import {
  collectAdminDashboardStats,
  emptyAdminDashboardStats,
} from "../lib/admin/stats";
import { closeDatabase, DEVELOPMENT_DATABASE_NAME } from "../lib/db";

const ENV_KEYS = [
  "MONGODB_DB_NAME",
  "NODE_ENV",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD_HASH",
  "JWT_SECRET",
  "ADMIN_SESSION_TTL",
  "APP_ORIGIN",
] as const;

const savedEnv: Record<string, string | undefined> = {};

function setEnv(key: string, value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  setEnv("MONGODB_DB_NAME", DEVELOPMENT_DATABASE_NAME);
  setEnv("NODE_ENV", "development");
});

afterEach(async () => {
  for (const key of ENV_KEYS) setEnv(key, savedEnv[key]);
  await closeDatabase();
});

type StatusRow = { _id: unknown; count: number };

type MockCollection = {
  aggregate: (pipeline: unknown[]) => {
    toArray: () => Promise<unknown[]>;
  };
  insertOne?: () => Promise<never>;
  updateOne?: () => Promise<never>;
  deleteOne?: () => Promise<never>;
};

function createMockDb(options: {
  tribesStatuses?: StatusRow[];
  knowledgeStatuses?: StatusRow[];
  festivalStatuses?: StatusRow[];
  morungStatuses?: StatusRow[];
}): { db: Db; tracker: { writeAttempts: number } } {
  const tracker = { writeAttempts: 0 };

  const refuseWrite = async () => {
    tracker.writeAttempts += 1;
    throw new Error("Write attempted during read-only stats collection");
  };

  const tribes: MockCollection = {
    aggregate: () => ({
      toArray: async () => options.tribesStatuses ?? [],
    }),
    insertOne: refuseWrite,
    updateOne: refuseWrite,
    deleteOne: refuseWrite,
  };

  const knowledge: MockCollection = {
    aggregate() {
      // One $facet round-trip for all / festivals / morungs.
      return {
        toArray: async () => [
          {
            all: options.knowledgeStatuses ?? [],
            festivals: options.festivalStatuses ?? [],
            morungs: options.morungStatuses ?? [],
          },
        ],
      };
    },
    insertOne: refuseWrite,
    updateOne: refuseWrite,
    deleteOne: refuseWrite,
  };

  const db = {
    collection(name: string) {
      if (name === "tribes") return tribes;
      if (name === "knowledge_items") return knowledge;
      throw new Error(`Unexpected collection: ${name}`);
    },
  } as unknown as Db;

  return { db, tracker };
}

describe("Admin dashboard stats — collectors", () => {
  it("returns zeros for empty collections", async () => {
    const { db, tracker } = createMockDb({});
    const stats = await collectAdminDashboardStats(db, DEVELOPMENT_DATABASE_NAME);

    assert.deepEqual(stats, emptyAdminDashboardStats(DEVELOPMENT_DATABASE_NAME));
    assert.equal(tracker.writeAttempts, 0);
  });

  it("aggregates real counts and status breakdowns without writing", async () => {
    const { db, tracker } = createMockDb({
      tribesStatuses: [
        { _id: "draft", count: 1 },
        { _id: "published", count: 1 },
      ],
      knowledgeStatuses: [
        { _id: "draft", count: 3 },
        { _id: "__missing__", count: 2 },
      ],
      festivalStatuses: [{ _id: "draft", count: 2 }],
      morungStatuses: [{ _id: "in_review", count: 1 }],
    });

    const stats = await collectAdminDashboardStats(db, DEVELOPMENT_DATABASE_NAME);

    assert.equal(stats.database, DEVELOPMENT_DATABASE_NAME);
    assert.equal(stats.tribes.total, 2);
    assert.equal(stats.tribes.byStatus.draft, 1);
    assert.equal(stats.tribes.byStatus.published, 1);
    assert.equal(stats.knowledgeItems.total, 5);
    assert.equal(stats.knowledgeItems.byStatus.missing, 2);
    assert.equal(stats.festivals.total, 2);
    assert.equal(stats.festivals.category, "festival_overview");
    assert.equal(stats.morungs.total, 1);
    assert.equal(stats.morungs.byStatus.in_review, 1);
    assert.equal(tracker.writeAttempts, 0);
  });
});

describe("Admin dashboard stats — API", () => {
  const username = "admin-tester";
  const secret = "unit-test-jwt-secret-at-least-32-chars";
  const passwordHash =
    "$2b$10$cX/INwWQIslKxtSnZlvw3ODEtxzv2K3MNqGqurMMB5.Yhb/qjo38a";

  beforeEach(() => {
    setEnv("ADMIN_USERNAME", username);
    setEnv("ADMIN_PASSWORD_HASH", passwordHash);
    setEnv("JWT_SECRET", secret);
    setEnv("ADMIN_SESSION_TTL", "8h");
    setEnv("APP_ORIGIN", "http://localhost:3000");
  });

  it("requires an authenticated admin session", async () => {
    const response = await statsGet(
      new Request("http://localhost:3000/api/admin/stats")
    );
    assert.equal(response.status, 401);
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(body.error, "Authentication required.");
    assert.equal("database" in body, false);
  });

  it("returns stats JSON for an authenticated session against the configured DB", async () => {
    const token = await createAdminSessionToken(username, {
      username,
      passwordHash,
      jwtSecret: secret,
      sessionTtlSeconds: 28800,
      appOrigin: "http://localhost:3000",
    });
    const setCookie = serializeAdminSessionCookie(token, {
      username,
      passwordHash,
      jwtSecret: secret,
      sessionTtlSeconds: 28800,
      appOrigin: "http://localhost:3000",
    });

    const response = await statsGet(
      new Request("http://localhost:3000/api/admin/stats", {
        headers: {
          cookie: setCookie.split(";")[0]!,
        },
      })
    );

    // Configured kikhobor_dev may be empty or unreachable; both are acceptable
    // as long as auth passed and no sensitive fields leak.
    assert.ok(response.status === 200 || response.status === 503);
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal("passwordHash" in body, false);
    assert.equal("token" in body, false);
    assert.equal("MONGODB_URI" in body, false);

    if (response.status === 200) {
      assert.equal(typeof body.database, "string");
      assert.equal(body.database, DEVELOPMENT_DATABASE_NAME);
      assert.equal(typeof (body.tribes as { total: number }).total, "number");
      assert.equal(
        typeof (body.knowledgeItems as { total: number }).total,
        "number"
      );
      assert.equal(typeof (body.festivals as { total: number }).total, "number");
      assert.equal(typeof (body.morungs as { total: number }).total, "number");
    } else {
      assert.equal(typeof body.error, "string");
    }
  });
});
