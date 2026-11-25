import type { Db } from "mongodb";
import { z } from "zod";
import {
  assertDatabaseWriteAllowed,
  getConfiguredDatabaseName,
  getDatabase,
} from "../db";

export const ADMIN_AUDIT_COLLECTION = "admin_audit_logs";

export const AdminAuditActionSchema = z.enum([
  "create",
  "update",
  "status_change",
  "archive",
  "login",
  "logout",
]);
export type AdminAuditAction = z.infer<typeof AdminAuditActionSchema>;

export const AdminAuditEntrySchema = z.object({
  actorUsername: z.string().min(1),
  action: AdminAuditActionSchema,
  collection: z.string().min(1),
  documentId: z.string().nullable().optional(),
  documentSlug: z.string().nullable().optional(),
  summary: z.string().min(1),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  createdAt: z.date(),
});
export type AdminAuditEntry = z.infer<typeof AdminAuditEntrySchema>;

export type RecordAdminAuditInput = {
  actorUsername: string;
  action: AdminAuditAction;
  collection: string;
  documentId?: string | null;
  documentSlug?: string | null;
  summary: string;
  before?: unknown;
  after?: unknown;
  /** Optional Db override (tests). Defaults to configured database. */
  db?: Db;
};

/**
 * Append an audit log entry.
 * Enforces database write guards before inserting.
 * Does not perform content CRUD.
 */
export async function recordAdminAuditEvent(
  input: RecordAdminAuditInput
): Promise<AdminAuditEntry> {
  const dbName = getConfiguredDatabaseName();
  assertDatabaseWriteAllowed(dbName);

  const entry: AdminAuditEntry = AdminAuditEntrySchema.parse({
    actorUsername: input.actorUsername,
    action: input.action,
    collection: input.collection,
    documentId: input.documentId ?? null,
    documentSlug: input.documentSlug ?? null,
    summary: input.summary,
    before: input.before,
    after: input.after,
    createdAt: new Date(),
  });

  const db = input.db ?? (await getDatabase(dbName));
  await db.collection(ADMIN_AUDIT_COLLECTION).insertOne({ ...entry });
  return entry;
}
