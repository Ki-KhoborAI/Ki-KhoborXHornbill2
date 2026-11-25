import { publishedContentFilter } from "./admin/content/publication";
import { getDatabase } from "./db";
import localKnowledgeData from "../data/knowledgeBase.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SourceRef = {
  type: "tribe" | "knowledge_item";
  slug: string;
  title: string;
  category?: string;
};

export type RetrievalResult = {
  context: string;
  sources: SourceRef[];
};

// ---------------------------------------------------------------------------
// Internal lookup tables (mirrors knowledge base structure)
// ---------------------------------------------------------------------------

const TRIBE_SLUGS = [
  "angami", "ao", "chakhesang", "chang", "garo", "kachari",
  "khiamniungan", "konyak", "kuki", "lotha", "phom", "pochury",
  "rengma", "sangtam", "sumi", "tikhir", "yimkhiung", "zeliang",
];

const FESTIVAL_TO_TRIBE: Record<string, string> = {
  sekrenyi: "angami",
  phousanyi: "angami",
  moatsu: "ao",
  tsungremmong: "ao",
  tsukhenyie: "chakhesang",
  sukhrunye: "chakhesang",
  naknyulum: "chang",
  kundaglum: "chang",
  wangala: "garo",
  "busu dima": "kachari",
  miu: "khiamniungan",
  tsokum: "khiamniungan",
  aoleang: "konyak",
  "lao-ong mo": "konyak",
  "lao ong mo": "konyak",
  lingnyu: "konyak",
  "bong-ong": "konyak",
  mimkut: "kuki",
  "chavang kut": "kuki",
  "tokhu emong": "lotha",
  tokhu: "lotha",
  monyu: "phom",
  yemshe: "pochury",
  ngada: "rengma",
  mongmong: "sangtam",
  tuluni: "sumi",
  ahuna: "sumi",
  tsungkamneo: "tikhir",
  metumneo: "yimkhiung",
  hega: "zeliang",
  langsimyi: "zeliang",
  "chaga gadi": "zeliang",
};

const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an",
  "and", "any", "are", "as", "at", "be", "because", "been", "before",
  "being", "below", "between", "both", "but", "by", "can", "could", "did",
  "do", "does", "doing", "down", "during", "each", "few", "for", "from",
  "further", "had", "has", "have", "having", "he", "her", "here", "hers",
  "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is",
  "it", "its", "itself", "me", "more", "most", "my", "myself", "no", "nor",
  "not", "of", "off", "on", "once", "only", "or", "other", "our", "ours",
  "ourselves", "out", "over", "own", "same", "she", "should", "so", "some",
  "such", "than", "that", "the", "their", "theirs", "them", "themselves",
  "then", "there", "these", "they", "this", "those", "through", "to", "too",
  "under", "until", "up", "very", "was", "we", "were", "what", "when",
  "where", "which", "while", "who", "whom", "why", "with", "would", "you",
  "your", "yours", "yourself", "yourselves", "tell", "give", "show", "know",
  "please", "find", "information",
]);

// ---------------------------------------------------------------------------
// Intent detection helpers
// ---------------------------------------------------------------------------

function detectTribeSlug(qLower: string): string | null {
  for (const slug of TRIBE_SLUGS) {
    if (new RegExp(`\\b${slug}\\b`, "i").test(qLower)) return slug;
  }
  for (const [fest, slug] of Object.entries(FESTIVAL_TO_TRIBE)) {
    if (qLower.includes(fest)) return slug;
  }
  return null;
}

function detectTribeAggregateIntent(qLower: string): boolean {
  if (qLower.includes("morung")) return false;
  const specificTribe = detectTribeSlug(qLower);
  const hasEnumeration = /all\s+(\d+\s+)?tribes|how\s+many|every\s+tribe/i.test(qLower);
  if (specificTribe && !hasEnumeration) return false;

  return (
    /how\s+many\s+.*tribes?/i.test(qLower) ||
    /number\s+of\s+.*tribes?/i.test(qLower) ||
    /count\s+of\s+.*tribes?/i.test(qLower) ||
    /tribes?\s+count/i.test(qLower) ||
    /name\s+(all\s+)?(the\s+)?(\d+\s+)?(naga\s+)?tribes/i.test(qLower) ||
    /list\s+(all\s+)?(the\s+)?(\d+\s+)?(naga\s+)?tribes/i.test(qLower) ||
    /what\s+are\s+the\s+(different\s+)?(\d+\s+)?(naga\s+)?tribes/i.test(qLower) ||
    /which\s+tribes\s+(are\s+there|exist|live|are\s+represented)/i.test(qLower) ||
    /all\s+(naga\s+)?tribes/i.test(qLower) ||
    /list\s+of\s+tribes/i.test(qLower)
  );
}

function extractKeywords(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// ---------------------------------------------------------------------------
// Formatting helpers — compact text blocks for Gemini context
// ---------------------------------------------------------------------------

function formatTribeBlock(doc: Record<string, unknown>): string {
  const name = doc.name ?? doc.title ?? doc.slug;
  const lines: string[] = [`TRIBE: ${name}`];

  const attrs = (doc.attributes as Record<string, unknown>) || {};
  const region = doc.regionOrDistricts ?? attrs.regionOrDistricts;
  const festival = doc.traditionalFestivalName ?? attrs.traditionalFestivalName;
  const season = doc.festivalDateOrSeason ?? attrs.festivalDateOrSeason;
  const traditions = doc.traditions ?? attrs.traditions;
  const attire = doc.traditionalAttire ?? attrs.traditionalAttire;
  const significance = doc.culturalSignificance ?? attrs.culturalSignificance ?? doc.content;

  if (region) lines.push(`Region/Districts: ${region}`);
  if (festival) lines.push(`Traditional Festival: ${festival}`);
  if (season) lines.push(`Festival Date/Season: ${season}`);
  if (traditions) lines.push(`Traditions: ${String(traditions).slice(0, 500)}`);
  if (attire) lines.push(`Traditional Attire: ${String(attire).slice(0, 300)}`);
  else lines.push(`Traditional Attire: Not available in current knowledge base`);
  if (significance) lines.push(`Cultural Significance: ${String(significance).slice(0, 400)}`);

  return lines.join("\n");
}

function formatKnowledgeBlock(doc: Record<string, unknown>): string {
  const lines: string[] = [`KNOWLEDGE ITEM [${doc.category ?? "general"}]: ${doc.title}`];
  if (doc.content) lines.push(String(doc.content).slice(0, 600));
  const attrs = doc.attributes as Record<string, unknown> | undefined;
  if (attrs && typeof attrs === "object") {
    for (const [k, v] of Object.entries(attrs)) {
      if (v && String(v).trim()) {
        lines.push(`${k}: ${String(v).slice(0, 200)}`);
      }
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Score a knowledge_item document against extracted keywords
// ---------------------------------------------------------------------------

function scoreKnowledgeItem(
  doc: Record<string, unknown>,
  keywords: string[]
): number {
  let score = 0;
  const slug = String(doc.slug ?? doc.id ?? "").toLowerCase();
  const title = String(doc.title ?? "").toLowerCase();
  const content = String(doc.content ?? "").toLowerCase();
  const category = String(doc.category ?? "").toLowerCase();

  for (const kw of keywords) {
    if (title.includes(kw)) score += 3;
    if (slug.includes(kw)) score += 2;
    if (content.includes(kw)) score += 1;
    if (category.includes(kw)) score += 1;
  }
  return score;
}

// ---------------------------------------------------------------------------
// Offline Fallback Retrieval using local knowledge base JSON
// ---------------------------------------------------------------------------

function retrieveFromLocalFallback(question: string): RetrievalResult {
  const qLower = question.toLowerCase();
  const keywords = extractKeywords(question);
  const contextBlocks: string[] = [];
  const sources: SourceRef[] = [];
  const localItems = localKnowledgeData as Array<Record<string, unknown>>;

  const isAggregate = detectTribeAggregateIntent(qLower);

  // --- Path A: Tribe aggregate ---
  if (isAggregate) {
    const tribeProfiles = localItems.filter((item) => item.category === "tribe_profile");
    if (tribeProfiles.length > 0) {
      const names = tribeProfiles.map((t) => {
        const attrs = (t.attributes as Record<string, unknown>) || {};
        return attrs.tribeName || String(t.title).replace(/ Tribe$/i, "");
      }).join(", ");

      contextBlocks.push(
        `TRIBES IN NAGALAND (${tribeProfiles.length} tribes):\n${names}`
      );
      sources.push({
        type: "tribe",
        slug: "all-tribes",
        title: `All ${tribeProfiles.length} Nagaland Tribes`,
      });
    }
    // When the question is solely an aggregate query, Path A is self-contained.
    return { context: contextBlocks.join("\n\n---\n\n"), sources };
  }

  // --- Path B: Specific tribe lookup ---
  const tribeSlug = detectTribeSlug(qLower);
  if (tribeSlug) {
    const tribeDoc = localItems.find(
      (item) =>
        item.category === "tribe_profile" &&
        (String(item.id).toLowerCase().includes(tribeSlug) ||
         String(item.title).toLowerCase().includes(tribeSlug))
    );

    if (tribeDoc) {
      contextBlocks.push(formatTribeBlock(tribeDoc));
      sources.push({
        type: "tribe",
        slug: tribeSlug,
        title: String(tribeDoc.title ?? tribeSlug),
      });
    }
  }

  // --- Path C: keyword-scored knowledge items ---
  if (keywords.length > 0) {
    const nonTribeItems = localItems.filter((item) => item.category !== "tribe_profile");

    const scored = nonTribeItems
      .map((doc) => ({ doc, score: scoreKnowledgeItem(doc, keywords) }))
      .filter(({ score, doc }) => {
        if (score <= 0) return false;
        // If a specific tribe was detected, require either tribe match or high relevance
        if (tribeSlug) {
          const slug = String(doc.slug ?? doc.id ?? "").toLowerCase();
          const title = String(doc.title ?? "").toLowerCase();
          return slug.includes(tribeSlug) || title.includes(tribeSlug) || score >= 4;
        }
        // General queries: require minimum score of 2 to eliminate trivial 1-word hits
        return score >= 2;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_KNOWLEDGE_ITEMS);

    for (const { doc } of scored) {
      contextBlocks.push(formatKnowledgeBlock(doc));
      sources.push({
        type: "knowledge_item",
        slug: String(doc.slug ?? doc.id ?? ""),
        title: String(doc.title ?? ""),
        category: String(doc.category ?? ""),
      });
    }
  }

  let context = contextBlocks.join("\n\n---\n\n");
  if (context.length > MAX_CONTEXT_CHARS) {
    context = context.slice(0, MAX_CONTEXT_CHARS) + "\n[...context trimmed]";
  }

  return { context, sources };
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

const MAX_CONTEXT_CHARS = 2500;
const MAX_KNOWLEDGE_ITEMS = 3;

export async function retrieveContext(question: string): Promise<RetrievalResult> {
  const qLower = question.toLowerCase();
  const keywords = extractKeywords(question);
  const contextBlocks: string[] = [];
  const sources: SourceRef[] = [];

  try {
    const db = await getDatabase();
    const isAggregate = detectTribeAggregateIntent(qLower);

    // --- Path A: Tribe aggregate (count / list all tribes) ---
    if (isAggregate) {
      const tribeDocs = await db
        .collection("tribes")
        .find(
          { ...publishedContentFilter },
          { projection: { slug: 1, name: 1, _id: 0 } }
        )
        .toArray();

      if (tribeDocs.length > 0) {
        const names = tribeDocs.map((t) => t.name ?? t.slug).join(", ");
        contextBlocks.push(
          `TRIBES IN NAGALAND (${tribeDocs.length} tribes):\n${names}`
        );
        sources.push({
          type: "tribe",
          slug: "all-tribes",
          title: `All ${tribeDocs.length} Nagaland Tribes`,
        });
      }
      // When the question is solely an aggregate query, Path A is self-contained.
      return { context: contextBlocks.join("\n\n---\n\n"), sources };
    }

    // --- Path B: Specific tribe lookup ---
    const tribeSlug = detectTribeSlug(qLower);
    if (tribeSlug) {
      const tribeDoc = await db
        .collection("tribes")
        .findOne({
          slug: tribeSlug,
          ...publishedContentFilter,
        }) as Record<string, unknown> | null;

      if (tribeDoc) {
        contextBlocks.push(formatTribeBlock(tribeDoc));
        sources.push({
          type: "tribe",
          slug: tribeSlug,
          title: String(tribeDoc.name ?? tribeSlug),
        });
      }
    }

    // --- Path C: keyword-scored knowledge_items ---
    if (keywords.length > 0) {
      const allItems = await db
        .collection("knowledge_items")
        .find(
          { ...publishedContentFilter },
          {
            projection: {
              slug: 1,
              title: 1,
              category: 1,
              content: 1,
              attributes: 1,
              _id: 0,
            },
          }
        )
        .toArray() as Array<Record<string, unknown>>;

      const scored = allItems
        .map((doc) => ({ doc, score: scoreKnowledgeItem(doc, keywords) }))
        .filter(({ score, doc }) => {
          if (score <= 0) return false;
          if (tribeSlug) {
            const slug = String(doc.slug ?? "").toLowerCase();
            const title = String(doc.title ?? "").toLowerCase();
            return slug.includes(tribeSlug) || title.includes(tribeSlug) || score >= 4;
          }
          return score >= 2;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_KNOWLEDGE_ITEMS);

      for (const { doc } of scored) {
        const block = formatKnowledgeBlock(doc);
        contextBlocks.push(block);
        sources.push({
          type: "knowledge_item",
          slug: String(doc.slug ?? ""),
          title: String(doc.title ?? ""),
          category: String(doc.category ?? ""),
        });
      }
    }

    // --- Assemble and trim final context ---
    let context = contextBlocks.join("\n\n---\n\n");
    if (context.length > MAX_CONTEXT_CHARS) {
      context = context.slice(0, MAX_CONTEXT_CHARS) + "\n[...context trimmed]";
    }

    return { context, sources };
  } catch (err) {
    // If MongoDB Atlas is offline or restricted, fall back gracefully to local knowledge base
    console.warn(
      "[RAG Retrieval] MongoDB unavailable, falling back to local knowledge base:",
      err instanceof Error ? err.message : err
    );
    return retrieveFromLocalFallback(question);
  }
}
