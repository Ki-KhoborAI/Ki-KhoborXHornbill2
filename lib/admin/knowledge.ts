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
  AdminKnowledgeItemWriteSchema,
  canTransitionContentStatus,
  KnowledgeCategorySchema,
  slugify,
  type AdminContentStatus,
  type AdminKnowledgeItemWrite,
} from "./content/schemas";
import type { KnowledgeCategory } from "../importer/schemas";

export const KNOWLEDGE_COLLECTION = "knowledge_items";

export const FESTIVAL_KNOWLEDGE_CATEGORY = "festival_overview" as const;
export const MORUNG_KNOWLEDGE_CATEGORY = "morungs_overview" as const;

export class AdminKnowledgeError extends Error {
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
    this.name = "AdminKnowledgeError";
  }
}

export type AdminKnowledgeRecord = {
  id: string;
  slug: string;
  category: KnowledgeCategory;
  title: string;
  subtitle: string | null;
  content: string | null;
  source: string | null;
  status: AdminContentStatus;
  /** Opaque attributes preserved from import / prior edits — not rewritten by the form. */
  hasAttributes: boolean;
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

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCategory(value: unknown): KnowledgeCategory | null {
  const parsed = KnowledgeCategorySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function serializeAdminKnowledge(
  doc: WithId<Document>
): AdminKnowledgeRecord {
  const category = parseCategory(doc.category) ?? "festival_overview";
  const status = isContentStatus(doc.status) ? doc.status : "draft";
  const attributes =
    doc.attributes && typeof doc.attributes === "object" ? doc.attributes : {};

  return {
    id: String(doc._id),
    slug: typeof doc.slug === "string" ? doc.slug : "",
    category,
    title: typeof doc.title === "string" ? doc.title : "",
    subtitle: nullableString(doc.subtitle),
    content: nullableString(doc.content),
    source: nullableString(doc.source),
    status,
    hasAttributes: Object.keys(attributes as object).length > 0,
    createdBy: nullableString(doc.createdBy),
    updatedBy: nullableString(doc.updatedBy),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

/**
 * Normalize client payloads. Attributes are optional; omitted on update means preserve.
 */
export function normalizeAdminKnowledgeWriteInput(
  raw: unknown,
  options?: { requireAttributes?: boolean }
): AdminKnowledgeItemWrite {
  if (!raw || typeof raw !== "object") {
    throw new AdminKnowledgeError("Invalid knowledge payload.", "validation");
  }

  const body = raw as Record<string, unknown>;
  const hasAttributes = Object.prototype.hasOwnProperty.call(body, "attributes");

  const parsed = AdminKnowledgeItemWriteSchema.safeParse({
    ...body,
    slug:
      typeof body.slug === "string" && body.slug.trim()
        ? body.slug.trim()
        : undefined,
    title: typeof body.title === "string" ? body.title.trim() : body.title,
    subtitle: emptyToNull(body.subtitle as string | null | undefined),
    content: emptyToNull(body.content as string | null | undefined),
    source: emptyToNull(body.source as string | null | undefined),
    attributes: hasAttributes
      ? body.attributes
      : options?.requireAttributes
        ? {}
        : {},
  });

  if (!parsed.success) {
    throw new AdminKnowledgeError(
      parsed.error.issues[0]?.message || "Invalid knowledge payload.",
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
      throw new AdminKnowledgeError(error.message, "config");
    }
    throw error;
  }
}

function ensureWriteAllowed(dbName: string): void {
  try {
    assertDatabaseWriteAllowed(dbName);
  } catch (error) {
    if (error instanceof DatabaseWriteGuardError) {
      throw new AdminKnowledgeError(error.message, "write_guard");
    }
    throw error;
  }
}

async function findBySlug(
  db: Db,
  slug: string
): Promise<WithId<Document> | null> {
  return db.collection(KNOWLEDGE_COLLECTION).findOne({ slug });
}

export async function listAdminKnowledge(options?: {
  status?: AdminContentStatus;
  category?: KnowledgeCategory;
  db?: Db;
}): Promise<AdminKnowledgeRecord[]> {
  const { db } = await resolveDb(options?.db);
  const filter: Record<string, unknown> = {};
  if (options?.status && isContentStatus(options.status)) {
    filter.status = options.status;
  }
  if (options?.category) {
    const category = parseCategory(options.category);
    if (!category) {
      throw new AdminKnowledgeError("Invalid category filter.", "validation");
    }
    filter.category = category;
  }

  // List UI only needs identity + status — skip large content/attributes blobs.
  const docs = await db
    .collection(KNOWLEDGE_COLLECTION)
    .find(filter, {
      projection: {
        slug: 1,
        title: 1,
        category: 1,
        subtitle: 1,
        status: 1,
        createdBy: 1,
        updatedBy: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    })
    .sort({ title: 1 })
    .toArray();

  return docs.map(serializeAdminKnowledge);
}

export async function getAdminKnowledgeBySlug(
  slug: string,
  options?: { db?: Db; expectedCategory?: KnowledgeCategory }
): Promise<AdminKnowledgeRecord> {
  const trimmed = slug.trim();
  if (!trimmed) {
    throw new AdminKnowledgeError("Knowledge slug is required.", "validation");
  }

  const { db } = await resolveDb(options?.db);
  const doc = await findBySlug(db, trimmed);
  if (!doc) {
    throw new AdminKnowledgeError("Knowledge item not found.", "not_found");
  }

  const record = serializeAdminKnowledge(doc);
  if (
    options?.expectedCategory &&
    record.category !== options.expectedCategory
  ) {
    throw new AdminKnowledgeError("Knowledge item not found.", "not_found");
  }
  return record;
}

export async function createAdminKnowledge(
  rawInput: unknown,
  actorUsername: string,
  options?: { db?: Db; lockCategory?: KnowledgeCategory }
): Promise<AdminKnowledgeRecord> {
  const rawWithCategory =
    options?.lockCategory && rawInput && typeof rawInput === "object"
      ? { ...(rawInput as Record<string, unknown>), category: options.lockCategory }
      : rawInput;

  const input = normalizeAdminKnowledgeWriteInput(rawWithCategory, {
    requireAttributes: true,
  });
  const { db, dbName } = await resolveDb(options?.db);
  ensureWriteAllowed(dbName);

  const category = options?.lockCategory ?? input.category;
  if (options?.lockCategory && input.category !== options.lockCategory) {
    throw new AdminKnowledgeError(
      `Category must be "${options.lockCategory}" in this module.`,
      "validation"
    );
  }

  const status: AdminContentStatus = "draft";
  const slug = (input.slug?.trim() || slugify(input.title)).trim();
  if (!slug) {
    throw new AdminKnowledgeError(
      "Unable to derive a valid slug.",
      "validation"
    );
  }

  const existing = await findBySlug(db, slug);
  if (existing) {
    throw new AdminKnowledgeError(
      `A knowledge item with slug "${slug}" already exists.`,
      "conflict"
    );
  }

  const now = new Date();
  const document = {
    slug,
    category,
    title: input.title,
    subtitle: input.subtitle ?? null,
    content: input.content,
    attributes: input.attributes ?? {},
    source: input.source,
    status,
    metadata: input.metadata ?? undefined,
    createdBy: actorUsername,
    updatedBy: actorUsername,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection(KNOWLEDGE_COLLECTION).insertOne(document);
  const created = serializeAdminKnowledge({
    _id: result.insertedId,
    ...document,
  });

  await recordAdminAuditEvent({
    actorUsername,
    action: "create",
    collection: KNOWLEDGE_COLLECTION,
    documentId: created.id,
    documentSlug: created.slug,
    summary: `Created knowledge item "${created.title}"`,
    after: created,
    db,
  });

  return created;
}

export async function updateAdminKnowledge(
  slug: string,
  rawInput: unknown,
  actorUsername: string,
  options?: { db?: Db; lockCategory?: KnowledgeCategory }
): Promise<AdminKnowledgeRecord> {
  const rawWithCategory =
    options?.lockCategory && rawInput && typeof rawInput === "object"
      ? { ...(rawInput as Record<string, unknown>), category: options.lockCategory }
      : rawInput;

  const input = normalizeAdminKnowledgeWriteInput(rawWithCategory);
  const { db, dbName } = await resolveDb(options?.db);
  ensureWriteAllowed(dbName);

  const existing = await findBySlug(db, slug.trim());
  if (!existing) {
    throw new AdminKnowledgeError("Knowledge item not found.", "not_found");
  }

  const before = serializeAdminKnowledge(existing);
  if (options?.lockCategory && before.category !== options.lockCategory) {
    throw new AdminKnowledgeError("Knowledge item not found.", "not_found");
  }

  const nextCategory = options?.lockCategory ?? input.category;
  if (options?.lockCategory && input.category !== options.lockCategory) {
    throw new AdminKnowledgeError(
      `Category must remain "${options.lockCategory}" in this module.`,
      "validation"
    );
  }

  const nextSlug = (input.slug?.trim() || before.slug).trim();
  if (!nextSlug) {
    throw new AdminKnowledgeError(
      "Unable to derive a valid slug.",
      "validation"
    );
  }

  if (nextSlug !== before.slug) {
    const conflict = await findBySlug(db, nextSlug);
    if (conflict && String(conflict._id) !== before.id) {
      throw new AdminKnowledgeError(
        `A knowledge item with slug "${nextSlug}" already exists.`,
        "conflict"
      );
    }
  }

  const currentStatus = before.status;
  const requestedStatus = input.status ?? currentStatus;
  if (!canTransitionContentStatus(currentStatus, requestedStatus)) {
    throw new AdminKnowledgeError(
      `Cannot change status from "${currentStatus}" to "${requestedStatus}".`,
      "forbidden_transition"
    );
  }

  const now = new Date();
  const $set: Document = {
    slug: nextSlug,
    category: nextCategory,
    title: input.title,
    subtitle: input.subtitle ?? null,
    content: input.content,
    source: input.source,
    status: requestedStatus,
    updatedBy: actorUsername,
    updatedAt: now,
  };

  // Preserve existing attributes unless the client explicitly sent attributes.
  if (
    rawInput &&
    typeof rawInput === "object" &&
    Object.prototype.hasOwnProperty.call(rawInput, "attributes")
  ) {
    $set.attributes = input.attributes ?? {};
  }

  if (input.metadata) {
    $set.metadata = {
      ...(existing.metadata && typeof existing.metadata === "object"
        ? existing.metadata
        : {}),
      ...input.metadata,
    };
  }

  await db
    .collection(KNOWLEDGE_COLLECTION)
    .updateOne({ _id: existing._id }, { $set });

  const updatedDoc = await db
    .collection(KNOWLEDGE_COLLECTION)
    .findOne({ _id: existing._id });
  if (!updatedDoc) {
    throw new AdminKnowledgeError(
      "Knowledge item not found after update.",
      "not_found"
    );
  }

  const after = serializeAdminKnowledge(updatedDoc);
  const statusChanged = before.status !== after.status;

  await recordAdminAuditEvent({
    actorUsername,
    action: statusChanged ? "status_change" : "update",
    collection: KNOWLEDGE_COLLECTION,
    documentId: after.id,
    documentSlug: after.slug,
    summary: statusChanged
      ? `Changed knowledge "${after.title}" status ${before.status} → ${after.status}`
      : `Updated knowledge "${after.title}"`,
    before,
    after,
    db,
  });

  return after;
}

export async function updateAdminKnowledgeStatus(
  slug: string,
  nextStatus: AdminContentStatus,
  actorUsername: string,
  options?: { db?: Db; lockCategory?: KnowledgeCategory }
): Promise<AdminKnowledgeRecord> {
  if (!isContentStatus(nextStatus)) {
    throw new AdminKnowledgeError("Invalid status value.", "validation");
  }

  const { db, dbName } = await resolveDb(options?.db);
  ensureWriteAllowed(dbName);

  const existing = await findBySlug(db, slug.trim());
  if (!existing) {
    throw new AdminKnowledgeError("Knowledge item not found.", "not_found");
  }

  const before = serializeAdminKnowledge(existing);
  if (options?.lockCategory && before.category !== options.lockCategory) {
    throw new AdminKnowledgeError("Knowledge item not found.", "not_found");
  }

  if (!canTransitionContentStatus(before.status, nextStatus)) {
    throw new AdminKnowledgeError(
      `Cannot change status from "${before.status}" to "${nextStatus}".`,
      "forbidden_transition"
    );
  }

  if (before.status === nextStatus) {
    return before;
  }

  const now = new Date();
  await db.collection(KNOWLEDGE_COLLECTION).updateOne(
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
    .collection(KNOWLEDGE_COLLECTION)
    .findOne({ _id: existing._id });
  if (!updatedDoc) {
    throw new AdminKnowledgeError(
      "Knowledge item not found after status change.",
      "not_found"
    );
  }

  const after = serializeAdminKnowledge(updatedDoc);
  await recordAdminAuditEvent({
    actorUsername,
    action: nextStatus === "archived" ? "archive" : "status_change",
    collection: KNOWLEDGE_COLLECTION,
    documentId: after.id,
    documentSlug: after.slug,
    summary: `Changed knowledge "${after.title}" status ${before.status} → ${after.status}`,
    before,
    after,
    db,
  });

  return after;
}

export async function archiveAdminKnowledge(
  slug: string,
  actorUsername: string,
  options?: { db?: Db; lockCategory?: KnowledgeCategory }
): Promise<AdminKnowledgeRecord> {
  const { db, dbName } = await resolveDb(options?.db);
  ensureWriteAllowed(dbName);

  const existing = await findBySlug(db, slug.trim());
  if (!existing) {
    throw new AdminKnowledgeError("Knowledge item not found.", "not_found");
  }

  const before = serializeAdminKnowledge(existing);
  if (options?.lockCategory && before.category !== options.lockCategory) {
    throw new AdminKnowledgeError("Knowledge item not found.", "not_found");
  }

  if (before.status === "archived") {
    return before;
  }

  if (!canTransitionContentStatus(before.status, "archived")) {
    throw new AdminKnowledgeError(
      `Cannot archive knowledge item from status "${before.status}".`,
      "forbidden_transition"
    );
  }

  const now = new Date();
  await db.collection(KNOWLEDGE_COLLECTION).updateOne(
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
    .collection(KNOWLEDGE_COLLECTION)
    .findOne({ _id: existing._id });
  if (!updatedDoc) {
    throw new AdminKnowledgeError(
      "Knowledge item not found after archive.",
      "not_found"
    );
  }

  const after = serializeAdminKnowledge(updatedDoc);
  await recordAdminAuditEvent({
    actorUsername,
    action: "archive",
    collection: KNOWLEDGE_COLLECTION,
    documentId: after.id,
    documentSlug: after.slug,
    summary: `Archived knowledge "${after.title}"`,
    before,
    after,
    db,
  });

  return after;
}

export async function deleteAdminKnowledgePermanently(
  slug: string,
  actorUsername: string,
  options?: { db?: Db; lockCategory?: KnowledgeCategory }
): Promise<AdminKnowledgeRecord> {
  const { db, dbName } = await resolveDb(options?.db);
  ensureWriteAllowed(dbName);

  const existing = await findBySlug(db, slug.trim());
  if (!existing) {
    throw new AdminKnowledgeError("Knowledge item not found.", "not_found");
  }

  const before = serializeAdminKnowledge(existing);
  if (options?.lockCategory && before.category !== options.lockCategory) {
    throw new AdminKnowledgeError("Knowledge item not found.", "not_found");
  }

  if (before.status !== "draft" && before.status !== "archived") {
    throw new AdminKnowledgeError(
      "Only draft or archived knowledge items can be permanently deleted. Archive first.",
      "forbidden_transition"
    );
  }

  if (!(existing._id instanceof ObjectId) && typeof existing._id !== "string") {
    throw new AdminKnowledgeError("Knowledge record is invalid.", "validation");
  }

  await db.collection(KNOWLEDGE_COLLECTION).deleteOne({ _id: existing._id });

  await recordAdminAuditEvent({
    actorUsername,
    action: "archive",
    collection: KNOWLEDGE_COLLECTION,
    documentId: before.id,
    documentSlug: before.slug,
    summary: `Permanently deleted knowledge "${before.title}"`,
    before,
    after: null,
    db,
  });

  return before;
}

export function adminKnowledgeErrorStatus(error: AdminKnowledgeError): number {
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
