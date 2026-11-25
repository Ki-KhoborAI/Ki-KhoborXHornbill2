import { z } from "zod";
import {
  ContentStatusSchema,
  KnowledgeCategorySchema,
  SourceMetadataSchema,
  slugify,
} from "../../importer/schemas";

/**
 * Admin-facing content schemas.
 * Reuse importer field shapes and category enums, but allow the full
 * content lifecycle status. Importer schemas remain draft-locked.
 */

export const AdminContentStatusSchema = ContentStatusSchema;
export type AdminContentStatus = z.infer<typeof AdminContentStatusSchema>;

export const CONTENT_STATUS_TRANSITIONS: Record<
  AdminContentStatus,
  readonly AdminContentStatus[]
> = {
  draft: ["in_review", "archived"],
  in_review: ["draft", "verified", "archived"],
  verified: ["in_review", "published", "archived"],
  published: ["archived", "in_review"],
  archived: ["draft"],
} as const;

export function canTransitionContentStatus(
  from: AdminContentStatus,
  to: AdminContentStatus
): boolean {
  if (from === to) return true;
  return CONTENT_STATUS_TRANSITIONS[from].includes(to);
}

/** Shared audit fields recorded on admin-managed documents. */
export const AdminDocumentAuditSchema = z.object({
  createdBy: z.string().min(1).nullable().optional(),
  updatedBy: z.string().min(1).nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Tribe create/update payload for admin APIs (future CRUD).
 * Does not alter importer TribeSchema.
 */
export const AdminTribeWriteSchema = z.object({
  slug: z.string().min(1).optional(),
  name: z.string().min(1),
  regionOrDistricts: z.string().nullable(),
  traditionalFestivalName: z.string().nullable(),
  festivalDateOrSeason: z.string().nullable(),
  traditions: z.string().nullable(),
  traditionalAttire: z.string().nullable(),
  culturalSignificance: z.string().nullable(),
  source: z.string().nullable(),
  status: AdminContentStatusSchema.default("draft"),
  metadata: SourceMetadataSchema.partial().optional(),
});
export type AdminTribeWrite = z.infer<typeof AdminTribeWriteSchema>;

/**
 * Knowledge item create/update payload for admin APIs (future CRUD).
 */
export const AdminKnowledgeItemWriteSchema = z.object({
  slug: z.string().min(1).optional(),
  category: KnowledgeCategorySchema,
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  content: z.string().nullable(),
  attributes: z.record(z.string(), z.unknown()).default({}),
  source: z.string().nullable(),
  status: AdminContentStatusSchema.default("draft"),
  metadata: SourceMetadataSchema.partial().optional(),
});
export type AdminKnowledgeItemWrite = z.infer<
  typeof AdminKnowledgeItemWriteSchema
>;

export const AdminStatusUpdateSchema = z.object({
  status: AdminContentStatusSchema,
});

export { KnowledgeCategorySchema, SourceMetadataSchema, slugify };
