import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Db } from "mongodb";
import { requireAdminMutation } from "../lib/admin/auth/guard";
import {
  createAdminSessionToken,
  serializeAdminSessionCookie,
} from "../lib/admin/auth/session";
import { recordAdminAuditEvent } from "../lib/admin/audit";
import {
  canTransitionContentStatus,
  isPublishedForPublicRetrieval,
  publishedContentFilter,
  PUBLISHED_CONTENT_STATUS,
  withPublishedContentFilter,
  AdminTribeWriteSchema,
  AdminKnowledgeItemWriteSchema,
} from "../lib/admin/content";
import { TribeSchema } from "../lib/importer/schemas";
import {
  assertDatabaseWriteAllowed,
  DatabaseConfigError,
  DatabaseWriteGuardError,
  DEVELOPMENT_DATABASE_NAME,
  getConfiguredDatabaseName,
  isProductionDatabaseName,
  PRODUCTION_DATABASE_NAME,
  validateDatabaseName,
} from "../lib/db";

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

function snapshotEnv(): void {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
}

function restoreEnv(): void {
  for (const key of ENV_KEYS) setEnv(key, savedEnv[key]);
}

beforeEach(() => {
  snapshotEnv();
  setEnv("MONGODB_DB_NAME", DEVELOPMENT_DATABASE_NAME);
  setEnv("NODE_ENV", "development");
});

afterEach(() => {
  restoreEnv();
});

describe("Database target configuration", () => {
  it("requires MONGODB_DB_NAME and rejects invalid names", () => {
    setEnv("MONGODB_DB_NAME", undefined);
    assert.throws(() => getConfiguredDatabaseName(), DatabaseConfigError);

    setEnv("MONGODB_DB_NAME", "bad name");
    assert.throws(() => getConfiguredDatabaseName(), DatabaseConfigError);

    setEnv("MONGODB_DB_NAME", DEVELOPMENT_DATABASE_NAME);
    assert.equal(getConfiguredDatabaseName(), DEVELOPMENT_DATABASE_NAME);
    assert.equal(validateDatabaseName("kikhobor_dev"), "kikhobor_dev");
  });

  it("identifies the production database name", () => {
    assert.equal(isProductionDatabaseName(PRODUCTION_DATABASE_NAME), true);
    assert.equal(isProductionDatabaseName(DEVELOPMENT_DATABASE_NAME), false);
  });
});

describe("Database write guards", () => {
  it("refuses writes to production database outside production runtime", () => {
    setEnv("NODE_ENV", "development");
    setEnv("MONGODB_DB_NAME", PRODUCTION_DATABASE_NAME);
    assert.throws(
      () => assertDatabaseWriteAllowed(),
      DatabaseWriteGuardError
    );
  });

  it("allows writes to the development database in development", () => {
    setEnv("NODE_ENV", "development");
    setEnv("MONGODB_DB_NAME", DEVELOPMENT_DATABASE_NAME);
    assert.doesNotThrow(() => assertDatabaseWriteAllowed());
  });

  it("allows production database writes only in production runtime", () => {
    setEnv("NODE_ENV", "production");
    setEnv("MONGODB_DB_NAME", PRODUCTION_DATABASE_NAME);
    assert.doesNotThrow(() => assertDatabaseWriteAllowed());
  });
});

describe("Publication eligibility", () => {
  it("exposes a published-only Mongo filter", () => {
    assert.deepEqual(publishedContentFilter, { status: "published" });
    assert.equal(PUBLISHED_CONTENT_STATUS, "published");
    assert.deepEqual(withPublishedContentFilter({ slug: "angami" }), {
      slug: "angami",
      status: "published",
    });
  });

  it("accepts only status === published for public retrieval", () => {
    assert.equal(isPublishedForPublicRetrieval({ status: "published" }), true);
    assert.equal(isPublishedForPublicRetrieval({ status: "draft" }), false);
    assert.equal(isPublishedForPublicRetrieval({ status: "in_review" }), false);
    assert.equal(isPublishedForPublicRetrieval({ status: "verified" }), false);
    assert.equal(isPublishedForPublicRetrieval({ status: "archived" }), false);
    assert.equal(isPublishedForPublicRetrieval({}), false);
    assert.equal(isPublishedForPublicRetrieval({ status: null }), false);
    assert.equal(isPublishedForPublicRetrieval(null), false);
  });
});

describe("Admin content schemas", () => {
  it("keeps importer schemas draft-locked", () => {
    const tribe = TribeSchema.parse({
      slug: "angami",
      name: "Angami",
      regionOrDistricts: null,
      traditionalFestivalName: null,
      festivalDateOrSeason: null,
      traditions: null,
      traditionalAttire: null,
      culturalSignificance: null,
      source: null,
      metadata: {
        sourceWorkbook: "wb",
        sourceWorksheet: "ws",
        sourceRow: 1,
        importedAt: new Date(),
      },
    });
    assert.equal(tribe.status, "draft");

    assert.throws(() =>
      TribeSchema.parse({
        ...tribe,
        status: "published",
      })
    );
  });

  it("allows full lifecycle statuses on admin write schemas", () => {
    const tribe = AdminTribeWriteSchema.parse({
      name: "Angami",
      regionOrDistricts: null,
      traditionalFestivalName: null,
      festivalDateOrSeason: null,
      traditions: null,
      traditionalAttire: null,
      culturalSignificance: null,
      source: null,
      status: "published",
    });
    assert.equal(tribe.status, "published");

    const knowledge = AdminKnowledgeItemWriteSchema.parse({
      category: "festival_overview",
      title: "What the Hornbill Festival is",
      content: "Example",
      source: null,
      status: "in_review",
    });
    assert.equal(knowledge.status, "in_review");
  });

  it("encodes conservative content status transitions", () => {
    assert.equal(canTransitionContentStatus("draft", "in_review"), true);
    assert.equal(canTransitionContentStatus("draft", "published"), false);
    assert.equal(canTransitionContentStatus("verified", "published"), true);
    assert.equal(canTransitionContentStatus("published", "archived"), true);
    assert.equal(canTransitionContentStatus("archived", "draft"), true);
  });
});

describe("Admin audit helper", () => {
  it("records an audit entry against a mock database after write-guard checks", async () => {
    setEnv("MONGODB_DB_NAME", DEVELOPMENT_DATABASE_NAME);
    setEnv("NODE_ENV", "development");

    const inserted: unknown[] = [];
    const mockDb = {
      collection() {
        return {
          async insertOne(doc: unknown) {
            inserted.push(doc);
            return { acknowledged: true, insertedId: "mock" };
          },
        };
      },
    } as unknown as Db;

    const entry = await recordAdminAuditEvent({
      actorUsername: "admin-tester",
      action: "update",
      collection: "tribes",
      documentSlug: "angami",
      summary: "Updated tribe draft fields",
      before: { status: "draft" },
      after: { status: "in_review" },
      db: mockDb,
    });

    assert.equal(entry.actorUsername, "admin-tester");
    assert.equal(entry.action, "update");
    assert.equal(inserted.length, 1);
  });

  it("blocks audit writes when the configured database is production in development", async () => {
    setEnv("MONGODB_DB_NAME", PRODUCTION_DATABASE_NAME);
    setEnv("NODE_ENV", "test");

    await assert.rejects(
      () =>
        recordAdminAuditEvent({
          actorUsername: "admin-tester",
          action: "update",
          collection: "tribes",
          summary: "should not write",
        }),
      DatabaseWriteGuardError
    );
  });
});

describe("requireAdminMutation", () => {
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

  it("rejects untrusted origins before session checks", async () => {
    const response = await requireAdminMutation(
      new Request(`${origin}/api/admin/tribes`, {
        method: "POST",
        headers: { origin: "https://evil.example" },
      })
    );
    assert.ok(response instanceof Response);
    assert.equal(response.status, 403);
  });

  it("accepts a trusted origin with a valid session cookie", async () => {
    const token = await createAdminSessionToken(username, {
      username,
      passwordHash,
      jwtSecret: secret,
      sessionTtlSeconds: 28800,
      appOrigin: origin,
    });
    const cookie = serializeAdminSessionCookie(token, {
      username,
      passwordHash,
      jwtSecret: secret,
      sessionTtlSeconds: 28800,
      appOrigin: origin,
    });

    const session = await requireAdminMutation(
      new Request(`${origin}/api/admin/tribes`, {
        method: "POST",
        headers: {
          origin,
          cookie: cookie.split(";")[0]!,
        },
      })
    );

    assert.equal(session instanceof Response, false);
    if (!(session instanceof Response)) {
      assert.deepEqual(session, { username });
    }
  });
});
