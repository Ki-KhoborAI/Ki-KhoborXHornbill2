/**
 * Public retrieval eligibility for tribes and knowledge items.
 *
 * Eligible:
 * - status === "published"
 * - legacy importer rows still marked "draft" but with no admin createdBy
 *   (festival catalog was imported as draft before the admin workflow)
 * - documents with missing/null status (pre-status-field data)
 *
 * Ineligible:
 * - draft/in_review/verified/archived content created or owned via admin
 * - archived / in_review / verified editorial states
 */

export const PUBLISHED_CONTENT_STATUS = "published" as const;

/** Mongo filter for public RAG and search queries. */
export const publishedContentFilter = {
  $or: [
    { status: PUBLISHED_CONTENT_STATUS },
    { status: { $exists: false } },
    { status: null },
    // Importer locked status to "draft" but that catalog was live festival content.
    // Admin-authored drafts always set createdBy and stay private until published.
    { status: "draft", createdBy: { $exists: false } },
    { status: "draft", createdBy: null },
  ],
} as const;

export type PublicationStatusInput = {
  status?: unknown;
  createdBy?: unknown;
};

/**
 * Returns true when a document may be shown in public Ask / search.
 */
export function isPublishedForPublicRetrieval(
  doc: PublicationStatusInput | null | undefined
): boolean {
  if (!doc) return false;
  if (doc.status === PUBLISHED_CONTENT_STATUS) return true;
  if (doc.status === undefined || doc.status === null) return true;
  if (doc.status === "draft" && (doc.createdBy === undefined || doc.createdBy === null)) {
    return true;
  }
  return false;
}

/**
 * Merge the public-visibility constraint into an existing Mongo filter object.
 */
export function withPublishedContentFilter<T extends Record<string, unknown>>(
  filter: T = {} as T
): T & { $or: (typeof publishedContentFilter)["$or"] } {
  return {
    ...filter,
    $or: publishedContentFilter.$or,
  };
}
