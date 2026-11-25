/**
 * Public retrieval eligibility for tribes and knowledge items.
 * Only explicitly published documents may reach RAG / public search.
 */

export const PUBLISHED_CONTENT_STATUS = "published" as const;

/** Mongo filter for public RAG and search queries. */
export const publishedContentFilter = {
  status: PUBLISHED_CONTENT_STATUS,
} as const;

export type PublicationStatusInput = {
  status?: unknown;
};

/**
 * Returns true only when status is exactly "published".
 * Missing, null, draft, in_review, verified, and archived are all ineligible.
 */
export function isPublishedForPublicRetrieval(
  doc: PublicationStatusInput | null | undefined
): boolean {
  return doc?.status === PUBLISHED_CONTENT_STATUS;
}

/**
 * Merge the published-only constraint into an existing Mongo filter object.
 */
export function withPublishedContentFilter<T extends Record<string, unknown>>(
  filter: T = {} as T
): T & { status: typeof PUBLISHED_CONTENT_STATUS } {
  return {
    ...filter,
    status: PUBLISHED_CONTENT_STATUS,
  };
}
