import { z } from 'zod';

/**
 * Publication lifecycle status for content.
 * All imported records strictly default to 'draft'.
 */
export const ContentStatusSchema = z.enum([
  'draft',
  'in_review',
  'verified',
  'published',
  'archived',
]);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

/**
 * Standard audit and provenance metadata attached to all imported documents.
 * Preserves the exact spreadsheet origin and unverified flags.
 */
export const SourceMetadataSchema = z.object({
  sourceWorkbook: z.string(),
  sourceWorksheet: z.string(),
  sourceRow: z.number().int().positive(),
  importedAt: z.date(),
  rawSourceStatus: z.string().nullable().optional(),
  sourceCitation: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  originalHeaders: z.record(z.string(), z.unknown()).optional(),
});
export type SourceMetadata = z.infer<typeof SourceMetadataSchema>;

/**
 * Tribe Schema
 * Represents one of the 18 recognized tribal/indigenous communities in Nagaland.
 * Preserves original source strings without fabricating missing fields (e.g., traditionalAttire).
 */
export const TribeSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  regionOrDistricts: z.string().nullable(),
  traditionalFestivalName: z.string().nullable(),
  festivalDateOrSeason: z.string().nullable(),
  traditions: z.string().nullable(),
  traditionalAttire: z.string().nullable(), // Null when unextracted/missing in source
  culturalSignificance: z.string().nullable(),
  source: z.string().nullable(),
  status: z.literal('draft').default('draft'),
  metadata: SourceMetadataSchema,
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Tribe = z.infer<typeof TribeSchema>;

/**
 * Knowledge Categories supported by the knowledge items collection.
 */
export const KnowledgeCategorySchema = z.enum([
  'festival_overview',
  'geography_basics',
  'flora_nature',
  'adventure_trekking',
  'handicrafts_handlooms',
  'music_instruments',
  'kisama_heritage',
  'morungs_overview',
]);
export type KnowledgeCategory = z.infer<typeof KnowledgeCategorySchema>;

/**
 * Knowledge Item Schema
 * Represents categorized static festival, geographic, cultural, and nature knowledge.
 */
export const KnowledgeItemSchema = z.object({
  slug: z.string().min(1),
  category: KnowledgeCategorySchema,
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  content: z.string().nullable(),
  attributes: z.record(z.string(), z.unknown()).default({}),
  source: z.string().nullable(),
  status: z.literal('draft').default('draft'),
  metadata: SourceMetadataSchema,
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>;

/**
 * Helper to generate deterministic, URL-friendly slugs from strings.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
