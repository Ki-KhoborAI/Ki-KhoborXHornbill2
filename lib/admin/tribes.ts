import { ObjectId, type Db, type Document, type WithId } from "mongodb";
import {
  assertDatabaseWriteAllowed,
  DatabaseConfigError,
  DatabaseWriteGuardError,
  getConfiguredDatabaseName,
  getDatabase,
} from "../db";
import { recordAdminAuditEvent } from "./audit";
import {
  AdminTribeWriteSchema,
  canTransitionContentStatus,
  slugify,
  type AdminContentStatus,
  type AdminTribeWrite,
} from "./content/schemas";

export const TRIBES_COLLECTION = "tribes";

export class AdminTribeError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_found"
      | "conflict"
      | "validation"
      | "forbidden_transition"
      | "config"
      | "write_guard"
  ) {
    super(message);
    this.name = "AdminTribeError";
  }
}

export type AdminTribeRecord = {
  id: string;
  slug: string;
  name: string;
  regionOrDistricts: string | null;
  traditionalFestivalName: string | null;
  festivalDateOrSeason: string | null;
  traditions: string | null;
  traditionalAttire: string | null;
  culturalSignificance: string | null;
  source: string | null;
  status: AdminContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const CONTENT_STATUSES: readonly AdminContentStatus[] = [
  "draft",
  "in_review",
  "verified",
  "published",
  "archived",
] as const;

function isContentStatus(value: unknown): value is AdminContentStatus {
  return (
    typeof value === "string" &&
    (CONTENT_STATUSES as readonly string[]).includes(value)
  );
}

function toIso(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

function nullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function serializeAdminTribe(doc: WithId<Document>): AdminTribeRecord {
  const status = isContentStatus(doc.status) ? doc.status : "draft";
  return {
    id: String(doc._id),
    slug: typeof doc.slug === "string" ? doc.slug : "",
    name: typeof doc.name === "string" ? doc.name : "",
    regionOrDistricts: nullableString(doc.regionOrDistricts),
    traditionalFestivalName: nullableString(doc.traditionalFestivalName),
    festivalDateOrSeason: nullableString(doc.festivalDateOrSeason),
    traditions: nullableString(doc.traditions),
    traditionalAttire: nullableString(doc.traditionalAttire),
    culturalSignificance: nullableString(doc.culturalSignificance),
    source: nullableString(doc.source),
    status,
    createdBy: nullableString(doc.createdBy),
    updatedBy: nullableString(doc.updatedBy),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalize client payloads: blank strings become null for nullable fields.
 */
export function normalizeAdminTribeWriteInput(
  raw: unknown
): AdminTribeWrite {
  if (!raw || typeof raw !== "object") {
    throw new AdminTribeError("Invalid tribe payload.", "validation");
  }

  const body = raw as Record<string, unknown>;
  const parsed = AdminTribeWriteSchema.safeParse({
    ...body,
    slug:
      typeof body.slug === "string" && body.slug.trim()
        ? body.slug.trim()
        : undefined,
    name: typeof body.name === "string" ? body.name.trim() : body.name,
    regionOrDistricts: emptyToNull(
      body.regionOrDistricts as string | null | undefined
    ),
    traditionalFestivalName: emptyToNull(
      body.traditionalFestivalName as string | null | undefined
    ),
    festivalDateOrSeason: emptyToNull(
      body.festivalDateOrSeason as string | null | undefined
    ),
    traditions: emptyToNull(body.traditions as string | null | undefined),
    traditionalAttire: emptyToNull(
      body.traditionalAttire as string | null | undefined
    ),
    culturalSignificance: emptyToNull(
      body.culturalSignificance as string | null | undefined
    ),
    source: emptyToNull(body.source as string | null | undefined),
  });

  if (!parsed.success) {
    throw new AdminTribeError(
      parsed.error.issues[0]?.message || "Invalid tribe payload.",
      "validation"
    );
  }

  return parsed.data;
}

async function resolveDb(db?: Db): Promise<{ db: Db; dbName: string }> {
  try {
    const dbName = getConfiguredDatabaseName();
    const resolved = db ?? (await getDatabase(dbName));
    return { db: resolved, dbName };
  } catch (error) {
    if (error instanceof DatabaseConfigError) {
      throw new AdminTribeError(error.message, "config");
    }
    throw error;
  }
}

function ensureWriteAllowed(dbName: string): void {
  try {
    assertDatabaseWriteAllowed(dbName);
  } catch (error) {
    if (error instanceof DatabaseWriteGuardError) {
      throw new AdminTribeError(error.message, "write_guard");
    }
    throw error;
  }
}

async function findBySlug(
  db: Db,
  slug: string
): Promise<WithId<Document> | null> {
  return db.collection(TRIBES_COLLECTION).findOne({ slug });
}

export async function listAdminTribes(options?: {
  status?: AdminContentStatus;
  db?: Db;
}): Promise<AdminTribeRecord[]> {
  const { db } = await resolveDb(options?.db);
  const filter =
    options?.status && isContentStatus(options.status)
      ? { status: options.status }
      : {};

  // List UI only needs identity + status fields — skip large text blobs.
  const docs = await db
    .collection(TRIBES_COLLECTION)
    .find(filter, {
      projection: {
        slug: 1,
        name: 1,
        regionOrDistricts: 1,
        status: 1,
        createdBy: 1,
        updatedBy: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    })
    .sort({ name: 1 })
    .toArray();

  return docs.map(serializeAdminTribe);
}

export async function getAdminTribeBySlug(
  slug: string,
  options?: { db?: Db }
): Promise<AdminTribeRecord> {
  const trimmed = slug.trim();
  if (!trimmed) {
    throw new AdminTribeError("Tribe slug is required.", "validation");
  }

  const { db } = await resolveDb(options?.db);
  const doc = await findBySlug(db, trimmed);
  if (!doc) {
    throw new AdminTribeError("Tribe not found.", "not_found");
  }
  return serializeAdminTribe(doc);
}

export async function createAdminTribe(
  rawInput: unknown,
  actorUsername: string,
  options?: { db?: Db }
): Promise<AdminTribeRecord> {
  const input = normalizeAdminTribeWriteInput(rawInput);
  const { db, dbName } = await resolveDb(options?.db);
  ensureWriteAllowed(dbName);

  // New records always start as draft — no shortcut to published.
  const status: AdminContentStatus = "draft";
  const slug = (input.slug?.trim() || slugify(input.name)).trim();
  if (!slug) {
    throw new AdminTribeError("Unable to derive a valid slug.", "validation");
  }

  const existing = await findBySlug(db, slug);
  if (existing) {
    throw new AdminTribeError(
      `A tribe with slug "${slug}" already exists.`,
      "conflict"
    );
  }

  const now = new Date();
  const document = {
    slug,
    name: input.name,
    regionOrDistricts: input.regionOrDistricts,
    traditionalFestivalName: input.traditionalFestivalName,
    festivalDateOrSeason: input.festivalDateOrSeason,
    traditions: input.traditions,
    traditionalAttire: input.traditionalAttire,
    culturalSignificance: input.culturalSignificance,
    source: input.source,
    status,
    metadata: input.metadata ?? undefined,
    createdBy: actorUsername,
    updatedBy: actorUsername,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection(TRIBES_COLLECTION).insertOne(document);
  const created = serializeAdminTribe({
    _id: result.insertedId,
    ...document,
  });

  await recordAdminAuditEvent({
    actorUsername,
    action: "create",
    collection: TRIBES_COLLECTION,
    documentId: created.id,
    documentSlug: created.slug,
    summary: `Created tribe "${created.name}"`,
    after: created,
    db,
  });

  return created;
}

export async function updateAdminTribe(
  slug: string,
  rawInput: unknown,
  actorUsername: string,
  options?: { db?: Db }
): Promise<AdminTribeRecord> {
  const input = normalizeAdminTribeWriteInput(rawInput);
  const { db, dbName } = await resolveDb(options?.db);
  ensureWriteAllowed(dbName);

  const existing = await findBySlug(db, slug.trim());
  if (!existing) {
    throw new AdminTribeError("Tribe not found.", "not_found");
  }

  const before = serializeAdminTribe(existing);
  const nextSlug = (input.slug?.trim() || before.slug).trim();
  if (!nextSlug) {
    throw new AdminTribeError("Unable to derive a valid slug.", "validation");
  }

  if (nextSlug !== before.slug) {
    const conflict = await findBySlug(db, nextSlug);
    if (conflict && String(conflict._id) !== before.id) {
      throw new AdminTribeError(
        `A tribe with slug "${nextSlug}" already exists.`,
        "conflict"
      );
    }
  }

  const currentStatus = before.status;
  const requestedStatus = input.status ?? currentStatus;
  if (!canTransitionContentStatus(currentStatus, requestedStatus)) {
    throw new AdminTribeError(
      `Cannot change status from "${currentStatus}" to "${requestedStatus}".`,
      "forbidden_transition"
    );
  }

  const now = new Date();
  const $set: Document = {
    slug: nextSlug,
    name: input.name,
    regionOrDistricts: input.regionOrDistricts,
    traditionalFestivalName: input.traditionalFestivalName,
    festivalDateOrSeason: input.festivalDateOrSeason,
    traditions: input.traditions,
    traditionalAttire: input.traditionalAttire,
    culturalSignificance: input.culturalSignificance,
    source: input.source,
    status: requestedStatus,
    updatedBy: actorUsername,
    updatedAt: now,
  };

  if (input.metadata) {
    $set.metadata = {
      ...(existing.metadata && typeof existing.metadata === "object"
        ? existing.metadata
        : {}),
      ...input.metadata,
    };
  }

  await db
    .collection(TRIBES_COLLECTION)
    .updateOne({ _id: existing._id }, { $set });

  const updatedDoc = await db.collection(TRIBES_COLLECTION).findOne({
    _id: existing._id,
  });
  if (!updatedDoc) {
    throw new AdminTribeError("Tribe not found after update.", "not_found");
  }

  const after = serializeAdminTribe(updatedDoc);
  const statusChanged = before.status !== after.status;

  await recordAdminAuditEvent({
    actorUsername,
    action: statusChanged ? "status_change" : "update",
    collection: TRIBES_COLLECTION,
    documentId: after.id,
    documentSlug: after.slug,
    summary: statusChanged
      ? `Changed tribe "${after.name}" status ${before.status} → ${after.status}`
      : `Updated tribe "${after.name}"`,
    before,
    after,
    db,
  });

  return after;
}

export async function updateAdminTribeStatus(
  slug: string,
  nextStatus: AdminContentStatus,
  actorUsername: string,
  options?: { db?: Db }
): Promise<AdminTribeRecord> {
  if (!isContentStatus(nextStatus)) {
    throw new AdminTribeError("Invalid status value.", "validation");
  }

  const { db, dbName } = await resolveDb(options?.db);
  ensureWriteAllowed(dbName);

  const existing = await findBySlug(db, slug.trim());
  if (!existing) {
    throw new AdminTribeError("Tribe not found.", "not_found");
  }

  const before = serializeAdminTribe(existing);
  if (!canTransitionContentStatus(before.status, nextStatus)) {
    throw new AdminTribeError(
      `Cannot change status from "${before.status}" to "${nextStatus}".`,
      "forbidden_transition"
    );
  }

  if (before.status === nextStatus) {
    return before;
  }

  const now = new Date();
  await db.collection(TRIBES_COLLECTION).updateOne(
    { _id: existing._id },
    {
      $set: {
        status: nextStatus,
        updatedBy: actorUsername,
        updatedAt: now,
      },
    }
  );

  const updatedDoc = await db
    .collection(TRIBES_COLLECTION)
    .findOne({ _id: existing._id });
  if (!updatedDoc) {
    throw new AdminTribeError("Tribe not found after status change.", "not_found");
  }

  const after = serializeAdminTribe(updatedDoc);
  await recordAdminAuditEvent({
    actorUsername,
    action: nextStatus === "archived" ? "archive" : "status_change",
    collection: TRIBES_COLLECTION,
    documentId: after.id,
    documentSlug: after.slug,
    summary: `Changed tribe "${after.name}" status ${before.status} → ${after.status}`,
    before,
    after,
    db,
  });

  return after;
}

/**
 * Soft-delete: transition to archived when allowed.
 */
export async function archiveAdminTribe(
  slug: string,
  actorUsername: string,
  options?: { db?: Db }
): Promise<AdminTribeRecord> {
  const { db, dbName } = await resolveDb(options?.db);
  ensureWriteAllowed(dbName);

  const existing = await findBySlug(db, slug.trim());
  if (!existing) {
    throw new AdminTribeError("Tribe not found.", "not_found");
  }

  const before = serializeAdminTribe(existing);
  if (before.status === "archived") {
    return before;
  }

  if (!canTransitionContentStatus(before.status, "archived")) {
    throw new AdminTribeError(
      `Cannot archive tribe from status "${before.status}".`,
      "forbidden_transition"
    );
  }

  const now = new Date();
  await db.collection(TRIBES_COLLECTION).updateOne(
    { _id: existing._id },
    {
      $set: {
        status: "archived",
        updatedBy: actorUsername,
        updatedAt: now,
      },
    }
  );

  const updatedDoc = await db
    .collection(TRIBES_COLLECTION)
    .findOne({ _id: existing._id });
  if (!updatedDoc) {
    throw new AdminTribeError("Tribe not found after archive.", "not_found");
  }

  const after = serializeAdminTribe(updatedDoc);
  await recordAdminAuditEvent({
    actorUsername,
    action: "archive",
    collection: TRIBES_COLLECTION,
    documentId: after.id,
    documentSlug: after.slug,
    summary: `Archived tribe "${after.name}"`,
    before,
    after,
    db,
  });

  return after;
}

/**
 * Permanent delete — only draft or archived records.
 */
export async function deleteAdminTribePermanently(
  slug: string,
  actorUsername: string,
  options?: { db?: Db }
): Promise<AdminTribeRecord> {
  const { db, dbName } = await resolveDb(options?.db);
  ensureWriteAllowed(dbName);

  const existing = await findBySlug(db, slug.trim());
  if (!existing) {
    throw new AdminTribeError("Tribe not found.", "not_found");
  }

  const before = serializeAdminTribe(existing);
  if (before.status !== "draft" && before.status !== "archived") {
    throw new AdminTribeError(
      "Only draft or archived tribes can be permanently deleted. Archive first.",
      "forbidden_transition"
    );
  }

  // Validate ObjectId shape when present (defensive).
  if (!(existing._id instanceof ObjectId) && typeof existing._id !== "string") {
    throw new AdminTribeError("Tribe record is invalid.", "validation");
  }

  await db.collection(TRIBES_COLLECTION).deleteOne({ _id: existing._id });

  await recordAdminAuditEvent({
    actorUsername,
    action: "archive",
    collection: TRIBES_COLLECTION,
    documentId: before.id,
    documentSlug: before.slug,
    summary: `Permanently deleted tribe "${before.name}"`,
    before,
    after: null,
    db,
  });

  return before;
}

export function adminTribeErrorStatus(error: AdminTribeError): number {
  switch (error.code) {
    case "not_found":
      return 404;
    case "conflict":
      return 409;
    case "validation":
    case "forbidden_transition":
      return 400;
    case "write_guard":
    case "config":
      return 503;
    default:
      return 500;
  }
}
