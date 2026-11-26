import { publishedContentFilter } from "../admin/content/publication";
import { getDatabase } from "../db";
import { detectTribeSlug } from "../tribesData";

export type TribeNameSlug = {
  slug: string;
  name: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match a question against a tribe catalog (slug or display name).
 * Longer names win first so "Ao" does not steal "Something Ao Extra" incorrectly
 * when both exist — we still require word boundaries.
 */
export function matchTribeSlugFromCatalog(
  question: string,
  tribes: TribeNameSlug[]
): string | null {
  const lower = question.toLowerCase();
  const ranked = [...tribes].sort((a, b) => {
    const aLen = Math.max(a.name.trim().length, a.slug.trim().length);
    const bLen = Math.max(b.name.trim().length, b.slug.trim().length);
    return bLen - aLen;
  });

  for (const tribe of ranked) {
    const slug = tribe.slug.trim().toLowerCase();
    const name = tribe.name.trim().toLowerCase();
    if (!slug) continue;

    if (name.length >= 2) {
      const nameRe = new RegExp(`\\b${escapeRegExp(name)}\\b`, "i");
      if (nameRe.test(lower)) return slug;
    }

    const slugRe = new RegExp(`\\b${escapeRegExp(slug)}\\b`, "i");
    if (slugRe.test(lower)) return slug;
  }

  return null;
}

/**
 * Resolve a tribe slug for Ask:
 * 1) static 18-tribe / festival map
 * 2) published tribes from the configured Mongo database (admin content)
 */
export async function resolvePublishedTribeSlug(
  question: string
): Promise<string | null> {
  const staticSlug = detectTribeSlug(question);
  if (staticSlug) return staticSlug;

  try {
    const db = await getDatabase();
    const docs = await db
      .collection("tribes")
      .find(
        { ...publishedContentFilter },
        { projection: { slug: 1, name: 1, _id: 0 } }
      )
      .toArray();

    const catalog: TribeNameSlug[] = docs
      .map((doc) => ({
        slug: typeof doc.slug === "string" ? doc.slug : "",
        name: typeof doc.name === "string" ? doc.name : "",
      }))
      .filter((row) => row.slug.length > 0);

    return matchTribeSlugFromCatalog(question, catalog);
  } catch (error) {
    console.warn(
      "[Ask] Published tribe lookup failed:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
