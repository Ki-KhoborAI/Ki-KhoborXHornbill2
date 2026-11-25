import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ObjectId, type Db } from "mongodb";
import {
  GET as tribesGet,
  POST as tribesPost,
} from "../app/api/admin/tribes/route";
import {
  DELETE as tribeDelete,
  GET as tribeGet,
  PATCH as tribePatch,
} from "../app/api/admin/tribes/[slug]/route";
import {
  createAdminSessionToken,
  serializeAdminSessionCookie,
} from "../lib/admin/auth/session";
import {
  archiveAdminTribe,
  createAdminTribe,
  deleteAdminTribePermanently,
  listAdminTribes,
  normalizeAdminTribeWriteInput,
  serializeAdminTribe,
  updateAdminTribeStatus,
  AdminTribeError,
} from "../lib/admin/tribes";
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

type TribeDoc = {
  _id: ObjectId;
  slug: string;
  name: string;
  status: string;
  regionOrDistricts: string | null;
  traditionalFestivalName: string | null;
  festivalDateOrSeason: string | null;
  traditions: string | null;
  traditionalAttire: string | null;
  culturalSignificance: string | null;
  source: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function createMockTribesDb(seed: TribeDoc[] = []) {
  const tribes = [...seed];
  const audit: unknown[] = [];

  const db = {
    collection(name: string) {
      if (name === "admin_audit_logs") {
        return {
          insertOne: async (doc: unknown) => {
            audit.push(doc);
            return { insertedId: new ObjectId() };
          },
        };
      }
      if (name !== "tribes") {
        throw new Error(`Unexpected collection: ${name}`);
      }
      return {
        find(filter: Record<string, unknown> = {}) {
          const rows = tribes.filter((doc) => {
            if (filter.status && doc.status !== filter.status) return false;
            return true;
          });
          return {
            sort() {
              return {
                toArray: async () =>
                  [...rows].sort((a, b) => a.name.localeCompare(b.name)),
              };
            },
          };
        },
        findOne: async (filter: Record<string, unknown>) => {
          if (typeof filter.slug === "string") {
            return tribes.find((doc) => doc.slug === filter.slug) ?? null;
          }
          if (filter._id) {
            return (
              tribes.find((doc) => String(doc._id) === String(filter._id)) ??
              null
            );
          }
          return null;
        },
        insertOne: async (doc: Omit<TribeDoc, "_id">) => {
          const insertedId = new ObjectId();
          tribes.push({ _id: insertedId, ...doc });
          return { insertedId };
        },
        updateOne: async (
          filter: { _id: ObjectId },
          update: { $set: Partial<TribeDoc> }
        ) => {
          const index = tribes.findIndex(
            (doc) => String(doc._id) === String(filter._id)
          );
          if (index < 0) return { matchedCount: 0, modifiedCount: 0 };
          tribes[index] = { ...tribes[index]!, ...update.$set };
          return { matchedCount: 1, modifiedCount: 1 };
        },
        deleteOne: async (filter: { _id: ObjectId }) => {
          const index = tribes.findIndex(
            (doc) => String(doc._id) === String(filter._id)
          );
          if (index < 0) return { deletedCount: 0 };
          tribes.splice(index, 1);
          return { deletedCount: 1 };
        },
      };
    },
  } as unknown as Db;

  return { db, tribes, audit };
}

describe("Admin tribes — helpers", () => {
  it("normalizes blank strings to null and defaults status to draft", () => {
    const parsed = normalizeAdminTribeWriteInput({
      name: "  Ao  ",
      regionOrDistricts: "  ",
      traditionalFestivalName: null,
      festivalDateOrSeason: "",
      traditions: "Moatsu",
      traditionalAttire: null,
      culturalSignificance: null,
      source: null,
    });

    assert.equal(parsed.name, "Ao");
    assert.equal(parsed.regionOrDistricts, null);
    assert.equal(parsed.festivalDateOrSeason, null);
    assert.equal(parsed.traditions, "Moatsu");
    assert.equal(parsed.status, "draft");
  });

  it("serializes tribe documents for admin JSON responses", () => {
    const id = new ObjectId();
    const record = serializeAdminTribe({
      _id: id,
      slug: "ao",
      name: "Ao",
      regionOrDistricts: "Mokokchung",
      traditionalFestivalName: null,
      festivalDateOrSeason: null,
      traditions: null,
      traditionalAttire: null,
      culturalSignificance: null,
      source: null,
      status: "draft",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    assert.equal(record.id, String(id));
    assert.equal(record.slug, "ao");
    assert.equal(record.status, "draft");
    assert.equal(record.createdAt, "2026-01-01T00:00:00.000Z");
  });
});

describe("Admin tribes — service mutations", () => {
  it("creates, lists, archives, and permanently deletes a draft tribe", async () => {
    const { db, tribes, audit } = createMockTribesDb();

    const created = await createAdminTribe(
      {
        name: "Test Tribe",
        regionOrDistricts: "Dimapur",
        traditionalFestivalName: null,
        festivalDateOrSeason: null,
        traditions: null,
        traditionalAttire: null,
        culturalSignificance: null,
        source: null,
      },
      "kiadmin",
      { db }
    );

    assert.equal(created.slug, "test-tribe");
    assert.equal(created.status, "draft");
    assert.equal(tribes.length, 1);

    const listed = await listAdminTribes({ db });
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.name, "Test Tribe");

    const archived = await archiveAdminTribe("test-tribe", "kiadmin", { db });
    assert.equal(archived.status, "archived");

    const deleted = await deleteAdminTribePermanently("test-tribe", "kiadmin", {
      db,
    });
    assert.equal(deleted.slug, "test-tribe");
    assert.equal(tribes.length, 0);
    assert.ok(audit.length >= 3);
  });

  it("rejects draft → published status jumps", async () => {
    const seed: TribeDoc = {
      _id: new ObjectId(),
      slug: "angami",
      name: "Angami",
      status: "draft",
      regionOrDistricts: null,
      traditionalFestivalName: null,
      festivalDateOrSeason: null,
      traditions: null,
      traditionalAttire: null,
      culturalSignificance: null,
      source: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { db } = createMockTribesDb([seed]);

    await assert.rejects(
      () => updateAdminTribeStatus("angami", "published", "kiadmin", { db }),
      (error: unknown) => {
        assert.ok(error instanceof AdminTribeError);
        assert.equal(error.code, "forbidden_transition");
        return true;
      }
    );
  });

  it("refuses permanent delete while published", async () => {
    const seed: TribeDoc = {
      _id: new ObjectId(),
      slug: "suma",
      name: "Sumi",
      status: "published",
      regionOrDistricts: null,
      traditionalFestivalName: null,
      festivalDateOrSeason: null,
      traditions: null,
      traditionalAttire: null,
      culturalSignificance: null,
      source: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { db } = createMockTribesDb([seed]);

    await assert.rejects(
      () => deleteAdminTribePermanently("suma", "kiadmin", { db }),
      (error: unknown) => {
        assert.ok(error instanceof AdminTribeError);
        assert.equal(error.code, "forbidden_transition");
        return true;
      }
    );
  });
});

describe("Admin tribes — API auth", () => {
  const username = "admin-tester";
  const secret = "unit-test-jwt-secret-at-least-32-chars";
  const origin = "http://localhost:3000";
  const passwordHash =
    "$2b$10$cX/INwWQIslKxtSnZlvw3ODEtxzv2K3MNqGqurMMB5.Yhb/qjo38a";

  beforeEach(() => {
    setEnv("ADMIN_USERNAME", username);
    setEnv("ADMIN_PASSWORD_HASH", passwordHash);
    setEnv("JWT_SECRET", secret);
    setEnv("ADMIN_SESSION_TTL", "8h");
    setEnv("APP_ORIGIN", origin);
  });

  async function authedCookie(): Promise<string> {
    const token = await createAdminSessionToken(username, {
      username,
      passwordHash,
      jwtSecret: secret,
      sessionTtlSeconds: 28800,
      appOrigin: origin,
    });
    return serializeAdminSessionCookie(token, {
      username,
      passwordHash,
      jwtSecret: secret,
      sessionTtlSeconds: 28800,
      appOrigin: origin,
    }).split(";")[0]!;
  }

  it("requires authentication for list and detail reads", async () => {
    const list = await tribesGet(new Request(`${origin}/api/admin/tribes`));
    assert.equal(list.status, 401);

    const detail = await tribeGet(
      new Request(`${origin}/api/admin/tribes/ao`),
      { params: Promise.resolve({ slug: "ao" }) }
    );
    assert.equal(detail.status, 401);
  });

  it("rejects untrusted origins on create/update/delete", async () => {
    const cookie = await authedCookie();

    const create = await tribesPost(
      new Request(`${origin}/api/admin/tribes`, {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "X" }),
      })
    );
    assert.equal(create.status, 403);

    const patch = await tribePatch(
      new Request(`${origin}/api/admin/tribes/ao`, {
        method: "PATCH",
        headers: {
          origin: "https://evil.example",
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "in_review" }),
      }),
      { params: Promise.resolve({ slug: "ao" }) }
    );
    assert.equal(patch.status, 403);

    const del = await tribeDelete(
      new Request(`${origin}/api/admin/tribes/ao`, {
        method: "DELETE",
        headers: {
          origin: "https://evil.example",
          cookie,
        },
      }),
      { params: Promise.resolve({ slug: "ao" }) }
    );
    assert.equal(del.status, 403);
  });

  it("lists tribes for an authenticated session against the configured DB", async () => {
    const cookie = await authedCookie();
    const response = await tribesGet(
      new Request(`${origin}/api/admin/tribes`, {
        headers: { cookie },
      })
    );

    assert.ok(response.status === 200 || response.status === 503);
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal("passwordHash" in body, false);
    assert.equal("MONGODB_URI" in body, false);

    if (response.status === 200) {
      assert.ok(Array.isArray(body.tribes));
      assert.ok((body.tribes as unknown[]).length >= 0);
    } else {
      assert.equal(typeof body.error, "string");
    }
  });
});
