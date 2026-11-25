import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ObjectId, type Db } from "mongodb";
import {
  GET as knowledgeGet,
  POST as knowledgePost,
} from "../app/api/admin/knowledge/route";
import {
  DELETE as knowledgeDelete,
  PATCH as knowledgePatch,
} from "../app/api/admin/knowledge/[slug]/route";
import {
  createAdminSessionToken,
  serializeAdminSessionCookie,
} from "../lib/admin/auth/session";
import {
  AdminKnowledgeError,
  archiveAdminKnowledge,
  createAdminKnowledge,
  deleteAdminKnowledgePermanently,
  listAdminKnowledge,
  normalizeAdminKnowledgeWriteInput,
  serializeAdminKnowledge,
  updateAdminKnowledge,
  updateAdminKnowledgeStatus,
} from "../lib/admin/knowledge";
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

type KnowledgeDoc = {
  _id: ObjectId;
  slug: string;
  category: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  attributes: Record<string, unknown>;
  source: string | null;
  status: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function createMockKnowledgeDb(seed: KnowledgeDoc[] = []) {
  const items = [...seed];
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
      if (name !== "knowledge_items") {
        throw new Error(`Unexpected collection: ${name}`);
      }
      return {
        find(filter: Record<string, unknown> = {}) {
          const rows = items.filter((doc) => {
            if (filter.status && doc.status !== filter.status) return false;
            if (filter.category && doc.category !== filter.category) return false;
            return true;
          });
          return {
            sort() {
              return {
                toArray: async () =>
                  [...rows].sort((a, b) => a.title.localeCompare(b.title)),
              };
            },
          };
        },
        findOne: async (filter: Record<string, unknown>) => {
          if (typeof filter.slug === "string") {
            return items.find((doc) => doc.slug === filter.slug) ?? null;
          }
          if (filter._id) {
            return (
              items.find((doc) => String(doc._id) === String(filter._id)) ?? null
            );
          }
          return null;
        },
        insertOne: async (doc: Omit<KnowledgeDoc, "_id">) => {
          const insertedId = new ObjectId();
          items.push({ _id: insertedId, ...doc });
          return { insertedId };
        },
        updateOne: async (
          filter: { _id: ObjectId },
          update: { $set: Partial<KnowledgeDoc> }
        ) => {
          const index = items.findIndex(
            (doc) => String(doc._id) === String(filter._id)
          );
          if (index < 0) return { matchedCount: 0, modifiedCount: 0 };
          items[index] = { ...items[index]!, ...update.$set };
          return { matchedCount: 1, modifiedCount: 1 };
        },
        deleteOne: async (filter: { _id: ObjectId }) => {
          const index = items.findIndex(
            (doc) => String(doc._id) === String(filter._id)
          );
          if (index < 0) return { deletedCount: 0 };
          items.splice(index, 1);
          return { deletedCount: 1 };
        },
      };
    },
  } as unknown as Db;

  return { db, items, audit };
}

describe("Admin knowledge — helpers", () => {
  it("normalizes blank strings and defaults status to draft", () => {
    const parsed = normalizeAdminKnowledgeWriteInput({
      category: "festival_overview",
      title: "  Hornbill  ",
      subtitle: "  ",
      content: "About the festival",
      source: null,
    });

    assert.equal(parsed.title, "Hornbill");
    assert.equal(parsed.subtitle, null);
    assert.equal(parsed.content, "About the festival");
    assert.equal(parsed.status, "draft");
    assert.deepEqual(parsed.attributes, {});
  });

  it("serializes knowledge documents without exposing raw ObjectIds", () => {
    const id = new ObjectId();
    const record = serializeAdminKnowledge({
      _id: id,
      slug: "what-the-hornbill-festival-is",
      category: "festival_overview",
      title: "What the Hornbill Festival is",
      subtitle: null,
      content: "Text",
      attributes: { keep: true },
      source: null,
      status: "draft",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    assert.equal(record.id, String(id));
    assert.equal(record.category, "festival_overview");
    assert.equal(record.hasAttributes, true);
    assert.equal(record.createdAt, "2026-01-01T00:00:00.000Z");
  });
});

describe("Admin knowledge — service mutations", () => {
  it("creates, filters by category, archives, and permanently deletes", async () => {
    const { db, items, audit } = createMockKnowledgeDb();

    const created = await createAdminKnowledge(
      {
        title: "Test Festival Note",
        content: "Draft note",
        source: null,
        subtitle: null,
      },
      "kiadmin",
      { db, lockCategory: "festival_overview" }
    );

    assert.equal(created.category, "festival_overview");
    assert.equal(created.status, "draft");
    assert.equal(items.length, 1);

    const festivals = await listAdminKnowledge({
      db,
      category: "festival_overview",
    });
    assert.equal(festivals.length, 1);

    const morungs = await listAdminKnowledge({
      db,
      category: "morungs_overview",
    });
    assert.equal(morungs.length, 0);

    const archived = await archiveAdminKnowledge(created.slug, "kiadmin", {
      db,
      lockCategory: "festival_overview",
    });
    assert.equal(archived.status, "archived");

    await deleteAdminKnowledgePermanently(created.slug, "kiadmin", {
      db,
      lockCategory: "festival_overview",
    });
    assert.equal(items.length, 0);
    assert.ok(audit.length >= 3);
  });

  it("preserves attributes when update payload omits them", async () => {
    const seed: KnowledgeDoc = {
      _id: new ObjectId(),
      slug: "keep-attrs",
      category: "morungs_overview",
      title: "Morung note",
      subtitle: null,
      content: "Old",
      attributes: { tribe: "ao", keepMe: true },
      source: null,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { db, items } = createMockKnowledgeDb([seed]);

    const updated = await updateAdminKnowledge(
      "keep-attrs",
      {
        category: "morungs_overview",
        title: "Morung note",
        subtitle: null,
        content: "New",
        source: null,
        status: "draft",
      },
      "kiadmin",
      { db, lockCategory: "morungs_overview" }
    );

    assert.equal(updated.content, "New");
    assert.equal(updated.hasAttributes, true);
    assert.deepEqual(items[0]?.attributes, { tribe: "ao", keepMe: true });
  });

  it("rejects draft → published jumps", async () => {
    const seed: KnowledgeDoc = {
      _id: new ObjectId(),
      slug: "blocked",
      category: "festival_overview",
      title: "Blocked",
      subtitle: null,
      content: null,
      attributes: {},
      source: null,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { db } = createMockKnowledgeDb([seed]);

    await assert.rejects(
      () =>
        updateAdminKnowledgeStatus("blocked", "published", "kiadmin", { db }),
      (error: unknown) => {
        assert.ok(error instanceof AdminKnowledgeError);
        assert.equal(error.code, "forbidden_transition");
        return true;
      }
    );
  });
});

describe("Admin knowledge — API auth", () => {
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

  it("requires authentication for list reads", async () => {
    const response = await knowledgeGet(
      new Request(`${origin}/api/admin/knowledge`)
    );
    assert.equal(response.status, 401);
  });

  it("rejects untrusted origins on mutations", async () => {
    const cookie = await authedCookie();

    const create = await knowledgePost(
      new Request(`${origin}/api/admin/knowledge`, {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          category: "festival_overview",
          title: "X",
          content: null,
          source: null,
        }),
      })
    );
    assert.equal(create.status, 403);

    const patch = await knowledgePatch(
      new Request(`${origin}/api/admin/knowledge/x`, {
        method: "PATCH",
        headers: {
          origin: "https://evil.example",
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "in_review" }),
      }),
      { params: Promise.resolve({ slug: "x" }) }
    );
    assert.equal(patch.status, 403);

    const del = await knowledgeDelete(
      new Request(`${origin}/api/admin/knowledge/x`, {
        method: "DELETE",
        headers: {
          origin: "https://evil.example",
          cookie,
        },
      }),
      { params: Promise.resolve({ slug: "x" }) }
    );
    assert.equal(del.status, 403);
  });

  it("lists knowledge for an authenticated session", async () => {
    const cookie = await authedCookie();
    const response = await knowledgeGet(
      new Request(`${origin}/api/admin/knowledge?category=festival_overview`, {
        headers: { cookie },
      })
    );

    assert.ok(response.status === 200 || response.status === 503);
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal("passwordHash" in body, false);
    assert.equal("MONGODB_URI" in body, false);
    if (response.status === 200) {
      assert.ok(Array.isArray(body.items));
    }
  });
});
