import localKnowledgeData from "../../data/knowledgeBase.json";
import {
  detectTribeSubCategory,
  formatTribeAggregateResponse,
  formatTribeResponse,
} from "../responseBuilder";
import {
  asString,
  type IntentClass,
  type LocalKnowledgeItem,
  type RetrievalOutcome,
  type RetrievedRecord,
} from "../types";
import { festivalDateContextScoreAdjustment } from "../knowledgeQuality";
import { evaluateRetrievalRelevance } from "./relevanceEvaluator";

const items = localKnowledgeData as LocalKnowledgeItem[];

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

export interface LocalRetrieveParams {
  query: string;
  intent: IntentClass;
  tribeSlug: string | null;
  activeLocationId?: string | null;
  activeTribe?: string | null;
}

export function retrieveFromLocal(params: LocalRetrieveParams): RetrievalOutcome {
  const { query, intent, tribeSlug, activeLocationId, activeTribe } = params;
  const qLower = query.toLowerCase().trim();

  // 1. Tribe Aggregate Request
  if (intent === "FACTUAL_TRIBE_LIST") {
    const tribes = items.filter((it) => it.category === "tribe_profile");
    if (tribes.length > 0) {
      const isCount = /how\s+many|number\s+of|count/i.test(qLower);
      const response = formatTribeAggregateResponse(tribes, isCount ? "count" : "list", "local");
      return { kind: "structured_response", response };
    }
    return { kind: "no_match" };
  }

  // 2. Specific Tribe Request
  if (intent === "FACTUAL_TRIBE" && tribeSlug) {
    const tribe = items.find(
      (it) =>
        it.category === "tribe_profile" &&
        (it.id === `tribe-${tribeSlug}` ||
          asString(it.attributes?.tribeName)?.toLowerCase() === tribeSlug ||
          String(it.title).toLowerCase().includes(tribeSlug))
    );
    if (tribe) {
      const subCat = detectTribeSubCategory(query);
      const response = formatTribeResponse(tribe, subCat, "local");
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

  const scored = items.map((item) => {
    let score = 0;
    const t = (item.title || "").toLowerCase();
    const c = (item.content || "").toLowerCase();
    const id = (item.id || "").toLowerCase();
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
      if (id === "location" || t === "location") score += 140;
      if (id.includes("kisama") || t.includes("kisama")) score += 60;
    }

    if (
      intent === "FACTUAL_DATES" ||
      rawTokens.includes("when") ||
      rawTokens.includes("date") ||
      rawTokens.includes("dates") ||
      rawTokens.includes("timing") ||
      rawTokens.includes("timings")
    ) {
      if (id.includes("date") || t.includes("date")) score += 140;
      if (id.includes("timing") || t.includes("timing")) score += 100;
      // Prefer current-year duration guidance over prior-edition handbook cards
      // unless the visitor explicitly asks about 2025.
      score += festivalDateContextScoreAdjustment({
        id,
        title: item.title,
        category: item.category,
        queryLower: qLower,
        attributes: item.attributes,
      });
    }

    if (rawTokens.includes("who") || rawTokens.includes("organizer") || rawTokens.includes("organises") || rawTokens.includes("organized")) {
      if (id.includes("organise") || t.includes("organise")) score += 140;
    }

    if (intent === "FACTUAL_MORUNG" || rawTokens.includes("morung") || rawTokens.includes("morungs") || qLower.includes("morung")) {
      if (tribeSlug) {
        const targetId = tribeSlug === "sumi" ? "morungs-overview-sumi-sema-morung" : `morungs-overview-${tribeSlug}-morung`;
        if (id === targetId) {
          score += 400;
        } else if ((id.includes(tribeSlug) || t.includes(tribeSlug)) && (id.includes("morung") || t.includes("morung"))) {
          score += 250;
        }
      } else if (/significance|count|meaning|how\s+many/i.test(qLower)) {
        if (id.includes("count-and-meaning") || id.includes("morungs-at-kisama")) {
          score += 350;
        } else if (id.includes("morung") || t.includes("morung")) {
          score += 80;
        }
      } else {
        if (id === "morungs-overview-kisama-heritage-village-general-morung-description" || (id.includes("general") && id.includes("morung"))) {
          score += 350;
        } else if (id.includes("morung") || t.includes("morung")) {
          score += 80;
        }
      }
    }

    if (rawTokens.includes("performance") || rawTokens.includes("performances") || (rawTokens.includes("cultural") && !rawTokens.includes("significance"))) {
      if (id === "what-the-hornbill-festival-is" || t.includes("what the hornbill festival is")) {
        score += 200;
      }
    }

    if (intent === "FACTUAL_ACTIVITIES" || rawTokens.includes("activit") || rawTokens.includes("activities") || rawTokens.includes("experience") || rawTokens.includes("experiences")) {
      const kisamaMentioned = qLower.includes("kisama") || rawTokens.includes("kisama");
      if (kisamaMentioned) {
        if (id.includes("kisama-naga-heritage-village") || t.includes("kisama naga heritage village") || t.includes("kisama heritage")) {
          score += 250;
        } else if (id.includes("morung") || t.includes("morung") || cat.includes("morung")) {
          score += 150;
        }
      } else {
        if (id === "what-the-hornbill-festival-is" || t.includes("what the hornbill festival is")) {
          score += 200;
        }
        if (cat.includes("adventure") || cat.includes("trekking")) {
          score += 60;
        }
      }
    }

    if (intent === "FACTUAL_FESTIVAL") {
      if (id === "what-the-hornbill-festival-is" || t.includes("what the hornbill festival is")) {
        score += 200;
      }
      if (id.includes("history") || id.includes("purpose")) {
        score += 120;
      }
    }

    // Active context boost
    if (activeTribe) {
      const atLower = activeTribe.toLowerCase();
      if (t.includes(atLower) || id.includes(atLower)) score += 50;
    }
    if (activeLocationId) {
      const alLower = activeLocationId.toLowerCase();
      if (id.includes(alLower)) score += 40;
    }

    // Token match scoring
    for (const tok of expandedTokens) {
      if (t === tok) score += 40;
      else if (t.includes(tok)) score += 20;
      if (id === tok) score += 35;
      else if (id.includes(tok)) score += 15;
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
      id: s.item.id,
      title: s.item.title,
      category: s.item.category || "General",
      content: s.item.content || "",
      attributes: s.item.attributes || {},
      source: s.item.source ? `${s.item.source} (offline)` : "Hornbill Festival Official Handbook (offline)",
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
