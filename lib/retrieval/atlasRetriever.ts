import { publishedContentFilter } from "../admin/content/publication";
import { getDatabase } from "../db";
import {
  detectTribeSubCategory,
  formatTribeAggregateResponse,
  formatTribeResponse,
} from "../responseBuilder";
import { festivalDateContextScoreAdjustment } from "../knowledgeQuality";
import type { IntentClass, RetrievalOutcome, RetrievedRecord } from "../types";
import { evaluateRetrievalRelevance } from "./relevanceEvaluator";

const SYNONYMS: Record<string, string[]> = {
  where: ["location", "located", "venue", "place", "kisama", "kohima", "site", "address", "situated"],
  located: ["location", "venue", "place", "kisama", "kohima"],
  location: ["where", "venue", "place", "kisama", "kohima"],
  when: ["date", "dates", "timing", "timings", "december", "schedule", "time", "calendar"],
  dates: ["when", "schedule", "timing", "december", "calendar"],
  timing: ["timings", "time", "hours", "when", "schedule"],
  who: ["organises", "organizer", "organizers", "government", "department", "tafma"],
  why: ["purpose", "objectives", "history", "significance"],
  tribes: ["tribe", "angami", "ao", "konyak", "sumi", "lotha", "chakhesang", "communities"],
  morung: ["morungs", "dormitory", "village", "architecture", "kisama"],
  dzukou: ["valley", "trek", "trekking", "nature", "trail"],
};

const STOPWORDS = new Set([
  "is", "the", "a", "an", "in", "at", "of", "to", "for", "about", "and", "or", "can", "i", "tell", "me", "please", "give", "show", "know"
]);

export interface RetrieveParams {
  query: string;
  intent: IntentClass;
  tribeSlug: string | null;
  activeLocationId?: string | null;
  activeTribe?: string | null;
}

/** Shape of knowledge_items documents used by Atlas scoring (fields actually read). */
type AtlasKnowledgeDoc = {
  _id?: unknown;
  slug?: string;
  title: string;
  category?: string;
  content?: string | null;
  attributes?: Record<string, unknown>;
  source?: string | null;
};

export async function retrieveFromAtlas(params: RetrieveParams): Promise<RetrievalOutcome> {
  const { query, intent, tribeSlug, activeLocationId, activeTribe } = params;
  const qLower = query.toLowerCase().trim();

  const db = await getDatabase();
  const tribesCol = db.collection("tribes");
  const kiCol = db.collection("knowledge_items");

  // 1. Tribe Aggregate Request — published documents only
  if (intent === "FACTUAL_TRIBE_LIST") {
    const tribes = await tribesCol
      .find({ ...publishedContentFilter })
      .sort({ name: 1 })
      .toArray();
    if (tribes.length > 0) {
      const isCount = /how\s+many|number\s+of|count/i.test(qLower);
      const response = formatTribeAggregateResponse(tribes, isCount ? "count" : "list", "atlas");
      return { kind: "structured_response", response };
    }
    return { kind: "no_match" };
  }

  // 2. Specific Tribe Request — published documents only
  if (intent === "FACTUAL_TRIBE" && tribeSlug) {
    const tribe = await tribesCol.findOne({
      slug: tribeSlug,
      ...publishedContentFilter,
    });
    if (tribe) {
      const subCat = detectTribeSubCategory(query);
      const response = formatTribeResponse(tribe, subCat, "atlas");
      return { kind: "structured_response", response };
    }
  }

  // 3. Knowledge Items Scoring
  const rawTokens = qLower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

  const expandedTokens = new Set(rawTokens);
  for (const t of rawTokens) {
    if (SYNONYMS[t]) {
      for (const s of SYNONYMS[t]) expandedTokens.add(s);
    }
  }

  const items = (await kiCol
    .find({ ...publishedContentFilter })
    .toArray()) as AtlasKnowledgeDoc[];

  const scored = items.map((item) => {
    let score = 0;
    const t = (item.title || "").toLowerCase();
    const c = (item.content || "").toLowerCase();
    const slug = (item.slug || "").toLowerCase();
    const cat = (item.category || "").toLowerCase();

    // Exact phrase match
    if (t === qLower) score += 150;
    else if (t.includes(qLower)) score += 70;
    if (c.includes(qLower)) score += 40;

    // Specific Intent Boosts
    if (
      intent === "FACTUAL_LOCATION" ||
      rawTokens.includes("where") ||
      rawTokens.includes("location") ||
      rawTokens.includes("located") ||
      rawTokens.includes("venue")
    ) {
      if (slug === "location" || t === "location") score += 140;
      if (slug.includes("kisama") || t.includes("kisama")) score += 60;
    }

    if (
      intent === "FACTUAL_DATES" ||
      rawTokens.includes("when") ||
      rawTokens.includes("date") ||
      rawTokens.includes("dates") ||
      rawTokens.includes("timing") ||
      rawTokens.includes("timings")
    ) {
      if (slug.includes("date") || t.includes("date")) score += 140;
      if (slug.includes("timing") || t.includes("timing")) score += 100;
      score += festivalDateContextScoreAdjustment({
        id: slug || item.title || "",
        title: item.title || "",
        category: item.category,
        queryLower: qLower,
        attributes: item.attributes,
      });
    }

    if (rawTokens.includes("who") || rawTokens.includes("organizer") || rawTokens.includes("organises") || rawTokens.includes("organized")) {
      if (slug.includes("organise") || t.includes("organise")) score += 140;
    }

    if (intent === "FACTUAL_MORUNG" || rawTokens.includes("morung") || rawTokens.includes("morungs") || qLower.includes("morung")) {
      if (tribeSlug) {
        const targetSlug = tribeSlug === "sumi" ? "morungs-overview-sumi-sema-morung" : `morungs-overview-${tribeSlug}-morung`;
        if (slug === targetSlug) {
          score += 400;
        } else if ((slug.includes(tribeSlug) || t.includes(tribeSlug)) && (slug.includes("morung") || t.includes("morung"))) {
          score += 250;
        }
      } else if (/significance|count|meaning|how\s+many/i.test(qLower)) {
        if (slug.includes("count-and-meaning") || slug.includes("morungs-at-kisama")) {
          score += 350;
        } else if (slug.includes("morung") || t.includes("morung")) {
          score += 80;
        }
      } else {
        if (slug === "morungs-overview-kisama-heritage-village-general-morung-description" || (slug.includes("general") && slug.includes("morung"))) {
          score += 350;
        } else if (slug.includes("morung") || t.includes("morung")) {
          score += 80;
        }
      }
    }

    // Cultural performances and visitor activities at Kisama
    if (rawTokens.includes("performance") || rawTokens.includes("performances") || (rawTokens.includes("cultural") && !rawTokens.includes("significance"))) {
      if (slug === "what-the-hornbill-festival-is" || t.includes("what the hornbill festival is")) {
        score += 200;
      }
    }

    if (intent === "FACTUAL_ACTIVITIES" || rawTokens.includes("activit") || rawTokens.includes("activities") || rawTokens.includes("experience") || rawTokens.includes("experiences")) {
      const kisamaMentioned = qLower.includes("kisama") || rawTokens.includes("kisama");
      if (kisamaMentioned) {
        if (slug.includes("kisama-naga-heritage-village") || t.includes("kisama naga heritage village") || t.includes("kisama heritage")) {
          score += 250;
        } else if (slug.includes("morung") || t.includes("morung") || cat.includes("morung")) {
          score += 150;
        }
      } else {
        if (slug === "what-the-hornbill-festival-is" || t.includes("what the hornbill festival is")) {
          score += 200;
        }
        if (cat.includes("adventure") || cat.includes("trekking")) {
          score += 60;
        }
      }
    }

    if (intent === "FACTUAL_FESTIVAL") {
      if (slug === "what-the-hornbill-festival-is" || t.includes("what the hornbill festival is")) {
        score += 200;
      }
      if (slug.includes("history") || slug.includes("purpose")) {
        score += 120;
      }
    }

    // Active context boost
    if (activeTribe) {
      const atLower = activeTribe.toLowerCase();
      if (t.includes(atLower) || slug.includes(atLower)) score += 50;
    }
    if (activeLocationId) {
      const alLower = activeLocationId.toLowerCase();
      if (slug.includes(alLower)) score += 40;
    }

    // Token match scoring
    for (const tok of expandedTokens) {
      if (t === tok) score += 40;
      else if (t.includes(tok)) score += 20;
      if (slug === tok) score += 35;
      else if (slug.includes(tok)) score += 15;
      if (cat.includes(tok)) score += 10;
      if (c.includes(tok)) score += 5;
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topMatch = scored[0];

  if (!topMatch || topMatch.score <= 0) {
    return { kind: "no_match" };
  }

  const records: RetrievedRecord[] = scored
    .filter((s) => s.score > 0)
    .slice(0, 4)
    .map((s) => ({
      id: s.item.slug || String(s.item._id),
      title: s.item.title,
      category: s.item.category || "General",
      content: s.item.content || "",
      attributes: s.item.attributes || {},
      source: s.item.source || "Hornbill Festival Official Handbook",
    }));

  const relevance = evaluateRetrievalRelevance(query, records, topMatch.score);
  if (!relevance.isRelevant) {
    return { kind: "no_match" };
  }

  return {
    kind: "records",
    records,
    primaryScore: topMatch.score,
  };
}
