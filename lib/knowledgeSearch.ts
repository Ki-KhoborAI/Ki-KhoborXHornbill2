import knowledgeData from "../data/knowledgeBase.json";
import {
  asString,
  tribeString,
  type LocalKnowledgeItem,
  type TribeLike,
} from "./types";

/** Offline knowledge item — alias of the shared LocalKnowledgeItem type. */
export type KnowledgeItem = LocalKnowledgeItem;

export type SearchResponse = {
  answer: string;
  title?: string;
  category?: string;
  source?: string | null;
  attributes?: Record<string, unknown>;
  relatedItems?: Array<{ id: string; title: string; category: string }>;
};

const items: KnowledgeItem[] = knowledgeData as KnowledgeItem[];

const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can",
  "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
  "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have",
  "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him",
  "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
  "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor",
  "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
  "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some",
  "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
  "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to",
  "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
  "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're",
  "you've", "your", "yours", "yourself", "yourselves", "tell", "give", "show", "know", "please"
]);

const TRIBE_SLUGS = [
  "angami", "ao", "chakhesang", "chang", "garo", "kachari",
  "khiamniungan", "konyak", "kuki", "lotha", "phom", "pochury",
  "rengma", "sangtam", "sumi", "tikhir", "yimkhiung", "zeliang"
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

function hasSpecificTribe(qLower: string): string | null {
  for (const slug of TRIBE_SLUGS) {
    if (new RegExp(`\\b${slug}\\b`, "i").test(qLower)) return slug;
  }
  for (const [fest, slug] of Object.entries(FESTIVAL_TO_TRIBE)) {
    if (qLower.includes(fest)) return slug;
  }
  return null;
}

function detectTribeAggregateIntent(qLower: string): "count" | "list" | null {
  // If Morung is mentioned, prioritize Morung retrieval
  if (qLower.includes("morung")) {
    return null;
  }

  // If a specific tribe is named, only treat as aggregate if explicitly asking for all/count
  const specificTribe = hasSpecificTribe(qLower);
  const hasEnumeration = /all\s+(\d+\s+)?tribes|how\s+many|every\s+tribe/i.test(qLower);
  if (specificTribe && !hasEnumeration) {
    return null;
  }

  // Count-specific intent patterns (e.g. "how many tribes", "how many naga tribe", "number of tribes")
  const isCountQuery =
    /how\s+many\s+.*tribes?/i.test(qLower) ||
    /number\s+of\s+.*tribes?/i.test(qLower) ||
    /count\s+of\s+.*tribes?/i.test(qLower) ||
    /tribes?\s+count/i.test(qLower);

  if (isCountQuery) {
    return "count";
  }

  // List-specific intent patterns (e.g. "name all tribes", "list the 18 tribes", "what are the different tribes")
  const isListQuery =
    /name\s+(all\s+)?(the\s+)?(\d+\s+)?(naga\s+)?tribes/i.test(qLower) ||
    /list\s+(all\s+)?(the\s+)?(\d+\s+)?(naga\s+)?tribes/i.test(qLower) ||
    /what\s+are\s+the\s+(different\s+)?(\d+\s+)?(naga\s+)?tribes/i.test(qLower) ||
    /tell\s+me\s+all\s+(the\s+)?(naga\s+)?tribe\s+names/i.test(qLower) ||
    /give\s+me\s+(the\s+)?names\s+of\s+(the\s+)?tribes/i.test(qLower) ||
    /which\s+tribes\s+(are\s+there|exist|live|are\s+represented)/i.test(qLower) ||
    /different\s+naga\s+tribes/i.test(qLower) ||
    /all\s+naga\s+tribes/i.test(qLower) ||
    /all\s+the\s+tribes/i.test(qLower) ||
    /list\s+of\s+tribes/i.test(qLower) ||
    /naga\s+tribes/i.test(qLower) ||
    /tribes\s+and\s+(their\s+)?cultures?/i.test(qLower);

  if (isListQuery) {
    return "list";
  }

  return null;
}

function detectIndividualTribeIntent(qLower: string): {
  tribeSlug: string;
  subCategory: "geography" | "festival" | "attire" | "traditions" | "cultural_significance" | "overview";
} | null {
  // CRITICAL: Never intercept Morung questions!
  if (qLower.includes("morung")) {
    return null;
  }

  const matchedTribeSlug = hasSpecificTribe(qLower);
  if (!matchedTribeSlug) return null;

  // Geography
  if (
    /where\s+(do|are|is|live)/i.test(qLower) ||
    /district/i.test(qLower) ||
    /region/i.test(qLower) ||
    /inhabit/i.test(qLower) ||
    /geograph/i.test(qLower)
  ) {
    return { tribeSlug: matchedTribeSlug, subCategory: "geography" };
  }

  // Traditional attire
  if (
    /attire/i.test(qLower) ||
    /dress/i.test(qLower) ||
    /cloth(es|ing)?/i.test(qLower) ||
    /wear/i.test(qLower) ||
    /costume/i.test(qLower) ||
    /shawl/i.test(qLower)
  ) {
    return { tribeSlug: matchedTribeSlug, subCategory: "attire" };
  }

  // Cultural significance
  if (
    /significance/i.test(qLower) ||
    /important/i.test(qLower) ||
    /importance/i.test(qLower) ||
    /why\s+is\s+.*important/i.test(qLower)
  ) {
    return { tribeSlug: matchedTribeSlug, subCategory: "cultural_significance" };
  }

  // Festival
  if (
    /festival/i.test(qLower) ||
    /celebrat/i.test(qLower) ||
    /when\s+is/i.test(qLower) ||
    /timing/i.test(qLower) ||
    /dates?/i.test(qLower)
  ) {
    return { tribeSlug: matchedTribeSlug, subCategory: "festival" };
  }

  // Traditions & customs
  if (
    /tradition/i.test(qLower) ||
    /custom/i.test(qLower) ||
    /practice/i.test(qLower) ||
    /ritual/i.test(qLower)
  ) {
    return { tribeSlug: matchedTribeSlug, subCategory: "traditions" };
  }

  // General overview
  return { tribeSlug: matchedTribeSlug, subCategory: "overview" };
}

function formatTribeResponse(tribe: TribeLike, subCategory: string) {
  const attrs = tribe.attributes;
  const tribeName = tribeString(tribe.name, attrs, "tribeName") || "Tribe";
  const region = tribeString(tribe.regionOrDistricts, attrs, "regionOrDistricts");
  const festName = tribeString(tribe.traditionalFestivalName, attrs, "traditionalFestivalName");
  const festDate = tribeString(tribe.festivalDateOrSeason, attrs, "festivalDateOrSeason");
  const traditions = tribeString(tribe.traditions, attrs, "traditions");
  const attire = tribeString(tribe.traditionalAttire, attrs, "traditionalAttire");
  const significance = tribeString(tribe.culturalSignificance, attrs, "culturalSignificance");
  const source = tribe.source || "Hornbill Festival Official Handbook";

  switch (subCategory) {
    case "geography": {
      const answer = region
        ? `The ${tribeName} people primarily inhabit ${region}.`
        : `The geographic and district information for the ${tribeName} tribe is not currently available in our database.`;
      return {
        title: `${tribeName} Tribe · Region & Districts`,
        category: "Culture & Tribes",
        answer,
        source,
      };
    }

    case "festival": {
      let answer: string;
      if (festName && festDate) {
        answer = `The traditional festival of the ${tribeName} tribe is ${festName}.\n\nFestival Date / Season: ${festDate}`;
      } else if (festName) {
        answer = `The traditional festival of the ${tribeName} tribe is ${festName}.`;
      } else if (festDate) {
        answer = `The traditional festival of the ${tribeName} tribe is observed during: ${festDate}.`;
      } else {
        answer = `The traditional festival information for the ${tribeName} tribe is not currently available in our database.`;
      }
      return {
        title: `${tribeName} Tribe · Traditional Festival`,
        category: "Culture & Tribes",
        answer,
        source,
      };
    }

    case "attire": {
      const answer = attire
        ? attire
        : `The traditional attire information for the ${tribeName} tribe is not currently available in our database.`;
      return {
        title: `${tribeName} Tribe · Traditional Attire`,
        category: "Culture & Tribes",
        answer,
        source,
      };
    }

    case "traditions": {
      const answer = traditions
        ? traditions
        : `The traditions and customs information for the ${tribeName} tribe is not currently available in our database.`;
      return {
        title: `${tribeName} Tribe · Traditions & Customs`,
        category: "Culture & Tribes",
        answer,
        source,
      };
    }

    case "cultural_significance": {
      const answer = significance
        ? significance
        : `The cultural significance information for the ${tribeName} tribe is not currently available in our database.`;
      return {
        title: `${tribeName} Tribe · Cultural Significance`,
        category: "Culture & Tribes",
        answer,
        source,
      };
    }

    case "overview":
    default: {
      const details: string[] = [];
      if (region) details.push(`• Region / Districts: ${region}`);
      if (festName) details.push(`• Traditional Festival: ${festName}`);
      if (festDate) details.push(`• Festival Date / Season: ${festDate}`);
      if (significance) details.push(`\nCultural Significance:\n${significance}`);
      if (traditions) details.push(`\nTraditions & Customs:\n${traditions}`);

      const answer =
        details.length > 0
          ? `The ${tribeName} tribe is one of the recognized indigenous tribes of Nagaland.\n\n${details.join("\n")}`
          : `The ${tribeName} tribe is one of the recognized indigenous tribes of Nagaland. Detailed records are currently being updated in our database.`;

      return {
        title: `${tribeName} Tribe`,
        category: "Culture & Tribes",
        answer,
        source,
      };
    }
  }
}

// ─── Festival activities intent detection ─────────────────────────────────────
const FESTIVAL_ACTIVITIES_PATTERN =
  /\b(what\s+can\s+(i|we)\s+(do|see|experience|enjoy)|what\s+(is\s+there|are\s+there)\s+to\s+(do|see)|things?\s+to\s+do|activities?\s+(to\s+do\s+(at|during|in|around)|at|during|in|around)|experiences?\s+(at|during|at\s+the|during\s+the)|what\s+activities|what\s+can\s+visitors?\s+(do|see)|what\s+to\s+do|what\s+do\s+(you|they)\s+do|what\s+happens\s+(at|during)|what\s+is\s+(there|on)\s+to\s+(do|see))\b/i;

function isFestivalActivitiesQuery(q: string): boolean {
  return FESTIVAL_ACTIVITIES_PATTERN.test(q);
}

function festivalActivitiesResponse(): SearchResponse {
  return {
    title: "Things to Do at the Hornbill Festival",
    category: "Festival Overview",
    answer:
      "The Hornbill Festival — the Festival of Festivals — offers a wide range of experiences for visitors:\n\n" +
      "• Cultural Performances: Witness traditional dances, songs, and ceremonies by all 18 Naga tribes at Kisama Heritage Village.\n" +
      "• Hornbill Music Festival: Enjoy live performances blending traditional Naga music with contemporary artists.\n" +
      "• Traditional Sports: Watch and participate in indigenous Naga sports and games.\n" +
      "• Food Festival: Taste authentic Naga cuisine, traditional smoked meats, rice beer, and more.\n" +
      "• Craft & Handloom Sales: Browse and buy traditional Naga shawls, cane-bamboo crafts, and handloom textiles.\n" +
      "• Morung Visits: Explore tribal morungs (traditional dormitories) at Kisama, each showcasing tribal architecture and artefacts.\n" +
      "• Adventure Activities: Trekking in Dzukou Valley, village walks in Khonoma, offroading, and heritage walks are available nearby.\n\n" +
      "Note: The detailed 2026 event programme and daily schedule will be published closer to the festival dates. Check the official Hornbill Festival website for updates.",
    source: "Hornbill Festival 2025 Final Handbook, p. PDF idx 3-4",
    relatedItems: [
      { id: "kisama-heritage-venue-kisama-naga-heritage-village", title: "Kisama - Naga Heritage Village", category: "kisama_heritage" },
      { id: "adventure-trekking-trekking-dzukou-valley-trek", title: "Dzukou Valley Trek", category: "adventure_trekking" },
      { id: "morungs-overview-kisama-heritage-village-general-morung-description", title: "Kisama Heritage Village - General Morung Description", category: "morungs_overview" },
    ],
  };
}

// ─── Out-of-scope political / government query detection ──────────────────────
const POLITICAL_QUERY_PATTERN =
  /\b(chief\s+minister|cm\s+of|governor\s+of|cm\b|mla\b|mp\b|minister\s+of|home\s+minister|cabinet\s+minister|government\s+official|politician|election|vote|party\s+(in\s+)?(power|government))\b/i;

function isOutOfScopePoliticalQuery(q: string): boolean {
  return POLITICAL_QUERY_PATTERN.test(q);
}

function outOfScopePoliticalResponse(): SearchResponse {
  return {
    title: "Out of Scope",
    category: "General",
    answer:
      "Information about current government officials, political matters, and elected representatives is outside the scope of the Ki-Khobor knowledge base.\n\n" +
      "For verified and up-to-date information, please consult official Government of Nagaland sources or reputable news outlets.\n\n" +
      "I can help you with:\n" +
      "• The Hornbill Festival — venue, dates, and history\n" +
      "• The 18 indigenous tribes of Nagaland and their traditions\n" +
      "• Cultural activities at Kisama Heritage Village\n" +
      "• Morungs and their significance\n" +
      "• Trekking and adventure experiences around Nagaland",
    source: null,
    relatedItems: [
      { id: "what-the-hornbill-festival-is", title: "What the Hornbill Festival is", category: "festival_overview" },
      { id: "kisama-heritage-venue-kisama-naga-heritage-village", title: "Kisama - Naga Heritage Village", category: "kisama_heritage" },
      { id: "introduction-to-nagaland-for-visitors", title: "Introduction to Nagaland", category: "festival_overview" },
    ],
  };
}

// ─── Greeting detection ───────────────────────────────────────────────────────
const GREETING_PATTERN =
  /^(hi|hello|hey|howdy|greetings|good\s+morning|good\s+afternoon|good\s+evening|how\s+are\s+you|how\s+r\s+u|hiya|yo)\s*[!?.]*$/i;

function isGreeting(q: string): boolean {
  return GREETING_PATTERN.test(q.trim());
}

function greetingResponse(): SearchResponse {
  return {
    title: "Ki-Khobor Assistant",
    category: "General",
    answer:
      "Namaste! 🎉 Welcome to Ki-Khobor — your guide to the Hornbill Festival 2026 and the cultures of Nagaland.\n\n" +
      "You can ask me about:\n" +
      "• The Hornbill Festival — dates, venue, history\n" +
      "• The 18 indigenous tribes of Nagaland\n" +
      "• Traditional festivals, attire, and customs\n" +
      "• Morungs at Kisama Heritage Village\n" +
      "• Dzukou Valley trek and natural attractions",
    source: null,
    relatedItems: [
      { id: "what-the-hornbill-festival-is", title: "What the Hornbill Festival is", category: "festival_overview" },
      { id: "kisama-naga-heritage-village", title: "Kisama Heritage Village", category: "kisama_heritage" },
      { id: "introduction-to-nagaland-for-visitors", title: "Introduction to Nagaland", category: "festival_overview" },
    ],
  };
}

// ─── Event / schedule intent detection ────────────────────────────────────────
function detectEventScheduleIntent(qLower: string): boolean {
  if (qLower.includes("performance") || (qLower.includes("activit") && qLower.includes("kisama"))) {
    return false;
  }
  return (
    /what\s+events\s+(are\s+happening|are\s+there|take\s+place)/i.test(qLower) ||
    /event\s+schedule/i.test(qLower) ||
    /schedule\s+of\s+events/i.test(qLower) ||
    /daily\s+(schedule|programme|program)/i.test(qLower) ||
    /where\s+can\s+i\s+find\s+the\s+(event\s+)?schedule/i.test(qLower) ||
    /what\s+is\s+the\s+(event\s+)?schedule/i.test(qLower) ||
    /festival\s+schedule/i.test(qLower) ||
    /event\s+programme/i.test(qLower) ||
    /programme\s+of\s+events/i.test(qLower) ||
    /hornbill\s+events/i.test(qLower) ||
    /what\s+events\b/i.test(qLower)
  );
}

function eventUnavailableResponse(): SearchResponse {
  return {
    title: "Event Schedule — Coming Soon",
    category: "Festival Events",
    answer:
      "The detailed event schedule and daily programme for Hornbill Festival 2026 is not yet available in our database.\n\n" +
      "In the meantime, you can explore:\n" +
      "• Adventure & trekking experiences (Dzukou Valley, Japfü Peak, and more)\n" +
      "• Traditional music and instruments of the Naga tribes\n" +
      "• The 18 Naga tribes and their cultural programmes at Kisama\n\n" +
      "Check the official Hornbill Festival website for the latest event schedule.",
    source: "Ki-Khobor — Hornbill Festival 2026",
    relatedItems: [
      { id: "kisama-naga-heritage-village", title: "Kisama Heritage Village", category: "kisama_heritage" },
      { id: "dzukou-valley", title: "Dzukou Valley Trek", category: "adventure_trekking" },
      { id: "what-the-hornbill-festival-is", title: "What the Hornbill Festival is", category: "festival_overview" },
    ],
  };
}

// ─── Private / out-of-scope detection ────────────────────────────────────────
const PRIVATE_INFO_PATTERN =
  /wi[-\s]?fi\s*(password|pass|code|key|credential|access)|password\s*(for|at|of|to)|hotel\s*(pass|wifi|wi[-\s]?fi|credential|room\s*key|check[- ]?in\s*code)|booking\s*(confirm|reference|code|number|pin)|room\s*(number|key|access)|check[- ]?in\s*(code|pin|password)/i;

function isPrivateInfoQuery(q: string): boolean {
  return PRIVATE_INFO_PATTERN.test(q);
}

function privateInfoResponse(): SearchResponse {
  return {
    title: "Private Information",
    category: "General",
    answer:
      "I'm sorry, but I'm not able to provide hotel credentials, Wi-Fi passwords, booking confirmation codes, or other private account information.\n\n" +
      "For hotel-specific queries, please contact your accommodation directly or check your booking confirmation email.\n\n" +
      "I can help you with:\n" +
      "• The Hornbill Festival — venue, dates, and history\n" +
      "• The 18 indigenous tribes of Nagaland\n" +
      "• Cultural activities and attractions at Kisama Heritage Village\n" +
      "• Trekking and adventure experiences around Nagaland",
    source: null,
    relatedItems: [
      { id: "what-the-hornbill-festival-is", title: "What the Hornbill Festival is", category: "festival_overview" },
      { id: "kisama-naga-heritage-village", title: "Kisama Heritage Village", category: "kisama_heritage" },
    ],
  };
}

// ─── Packing / visitor preparation detection ────────────────────────────────
const PACKING_QUERY_PATTERN =
  /\b(pack(ing)?|bring(ing)?|luggage|gear|what\s+to\s+wear|what\s+should\s+.*(bring|pack|carry)|items?\s+to\s+bring)\b/i;

function isPackingQuery(q: string): boolean {
  return PACKING_QUERY_PATTERN.test(q);
}

function packingUnavailableResponse(): SearchResponse {
  return {
    title: "Information Not Available",
    category: "General",
    answer:
      "A specific visitor packing list or gear guide is not currently available in the Ki-Khobor knowledge base.\n\n" +
      "Generally, Nagaland in December experiences cool to cold winter temperatures, especially in the evenings at Kisama (elevation ~1,400m). Visitors typically recommend carrying warm layers, comfortable walking shoes for hilly terrain, and necessary personal essentials.\n\n" +
      "You can ask me about:\n" +
      "• The Hornbill Festival — dates, venue, history\n" +
      "• The 18 indigenous tribes of Nagaland\n" +
      "• Cultural activities at Kisama Heritage Village\n" +
      "• Morungs and their significance\n" +
      "• Trekking — Dzukou Valley, Japfü Peak",
    source: null,
    relatedItems: [
      { id: "what-the-hornbill-festival-is", title: "What the Hornbill Festival is", category: "festival_overview" },
      { id: "kisama-naga-heritage-village", title: "Kisama - Naga Heritage Village", category: "kisama_heritage" },
      { id: "geography-basics-climate-best-time-to-visit", title: "Best time to visit", category: "geography_basics" },
    ],
  };
}

export function searchKnowledge(
  query: string,
  activeLocationId?: string | null,
  activeTribe?: string | null
): SearchResponse {
  const cleanQuery = query.trim();
  const qLower = cleanQuery.toLowerCase();

  // 0. Detect Greeting — short-circuit
  if (isGreeting(qLower)) {
    return greetingResponse();
  }

  // 0a. Detect private/out-of-scope — short-circuit
  if (isPrivateInfoQuery(qLower)) {
    return privateInfoResponse();
  }

  // 0b. Detect packing / what to bring — honest unavailable response
  if (isPackingQuery(qLower)) {
    return packingUnavailableResponse();
  }

  // 0c. Out-of-scope political / government queries
  if (isOutOfScopePoliticalQuery(qLower)) {
    return outOfScopePoliticalResponse();
  }

  // 0d. Festival activities / things to do
  if (isFestivalActivitiesQuery(qLower)) {
    return festivalActivitiesResponse();
  }

  // 1. Detect tribe count or tribe list intent
  const tribeIntent = detectTribeAggregateIntent(qLower);
  if (tribeIntent) {
    const tribes = items.filter((it) => it.category === "tribe_profile");
    tribes.sort((a, b) => a.title.localeCompare(b.title));
    const count = tribes.length;
    const cleanName = (t: KnowledgeItem) =>
      asString(t.attributes?.tribeName) || t.title.replace(/\s+Tribe$/i, "");
    const numberedList = tribes
      .map((t, idx) => `${idx + 1}. ${cleanName(t)}`)
      .join("\n");

    const answer =
      tribeIntent === "count"
        ? `According to the tribes currently represented in the Ki-Khobor database, there are ${count} records:\n\n${numberedList}`
        : `The indigenous tribes represented in the Ki-Khobor database are:\n\n${numberedList}`;

    return {
      title: "The 18 Indigenous Tribes of Nagaland",
      category: "Culture & Tribes",
      answer,
      source: "Hornbill Festival Official Handbook",
      relatedItems: tribes.slice(0, 4).map((t) => ({ id: t.id, title: t.title, category: t.category })),
    };
  }

  // 2. Detect individual tribe inquiry (geography, festival, traditions, attire, cultural significance, overview)
  const indIntent = detectIndividualTribeIntent(qLower);
  if (indIntent) {
    const tribeItem = items.find(
      (it) =>
        it.category === "tribe_profile" &&
        (it.id === `tribe-${indIntent.tribeSlug}` ||
          asString(it.attributes?.tribeName)?.toLowerCase() === indIntent.tribeSlug)
    );
    if (tribeItem) {
      const formatted = formatTribeResponse(tribeItem, indIntent.subCategory);
      return {
        title: formatted.title,
        category: formatted.category,
        answer: formatted.answer,
        source: formatted.source,
        relatedItems: [
          {
            id: `morungs-overview-${indIntent.tribeSlug}-morung`,
            title: `${asString(tribeItem.attributes?.tribeName) || tribeItem.title} Morung`,
            category: "morungs_overview",
          },
          {
            id: "kisama-naga-heritage-village",
            title: "Kisama Heritage Village",
            category: "kisama_heritage",
          },
        ],
      };
    }
  }

  // 3. Detect event schedule inquiry
  if (detectEventScheduleIntent(qLower)) {
    return eventUnavailableResponse();
  }

  // Tokenize keywords
  const tokens = qLower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

  const scored = items.map((item) => {
    let score = 0;
    const tLower = item.title.toLowerCase();
    const cLower = (item.content || "").toLowerCase();
    const catLower = (item.category || "").toLowerCase();
    const idLower = item.id.toLowerCase();
    const subLower = (item.subtitle || "").toLowerCase();

    // Exact phrase match bonuses
    if (tLower === qLower) score += 100;
    else if (tLower.includes(qLower)) score += 60;
    if (cLower.includes(qLower)) score += 30;

    // Intent-specific boosts
    if (tokens.includes("where") || tokens.includes("location") || tokens.includes("located") || tokens.includes("venue")) {
      if (idLower === "location" || tLower === "location") score += 140;
      if (idLower.includes("kisama") || tLower.includes("kisama")) score += 50;
    }

    if (tokens.includes("when") || tokens.includes("date") || tokens.includes("dates") || tokens.includes("timing")) {
      if (idLower.includes("date") || tLower.includes("date")) score += 140;
    }

    if (tokens.includes("who") || tokens.includes("organizer") || tokens.includes("organises")) {
      if (idLower.includes("organise") || tLower.includes("organise")) score += 140;
    }

    // Morung intent scoring
    if (tokens.includes("morung") || tokens.includes("morungs") || qLower.includes("morung")) {
      const specificTribe = hasSpecificTribe(qLower);
      if (specificTribe) {
        const targetSlug = specificTribe === "sumi" ? "morungs-overview-sumi-sema-morung" : `morungs-overview-${specificTribe}-morung`;
        if (idLower === targetSlug) {
          score += 400;
        } else if ((idLower.includes(specificTribe) || tLower.includes(specificTribe)) && (idLower.includes("morung") || tLower.includes("morung"))) {
          score += 250;
        }
      } else if (/significance|count|meaning|how\s+many/i.test(qLower)) {
        if (idLower.includes("count-and-meaning") || idLower.includes("morungs-at-kisama")) {
          score += 350;
        } else if (idLower.includes("morung") || tLower.includes("morung")) {
          score += 80;
        }
      } else {
        if (idLower === "morungs-overview-kisama-heritage-village-general-morung-description" || (idLower.includes("general") && idLower.includes("morung"))) {
          score += 350;
        } else if (idLower.includes("morung") || tLower.includes("morung")) {
          score += 80;
        }
      }
    }

    // Cultural performances and visitor activities at Kisama
    if (tokens.includes("performance") || tokens.includes("performances") || (tokens.includes("cultural") && !tokens.includes("significance"))) {
      if (idLower === "what-the-hornbill-festival-is" || tLower.includes("what the hornbill festival is")) {
        score += 200;
      }
    }
    // Kisama cultural activities: boost kisama_heritage and morungs, NOT window-to-nagaland
    if (tokens.includes("activit") || tokens.includes("activities") || tokens.includes("experience") || tokens.includes("experiences")) {
      const kisamaMentioned = qLower.includes("kisama") || tokens.includes("kisama");
      if (kisamaMentioned) {
        if (idLower.includes("kisama-naga-heritage-village") || tLower.includes("kisama naga heritage village") || tLower.includes("kisama heritage")) {
          score += 250;
        } else if (idLower.includes("morung") || tLower.includes("morung") || catLower.includes("morung")) {
          score += 150;
        }
      } else {
        // General activities question — slight boost for adventure/trekking
        if (catLower.includes("adventure") || catLower.includes("trekking")) {
          score += 60;
        }
      }
    }

    // Token-level scoring
    for (const token of tokens) {
      if (tLower.includes(token)) score += 20;
      if (idLower.includes(token)) score += 15;
      if (subLower.includes(token)) score += 10;
      if (catLower.includes(token)) score += 8;
      if (cLower.includes(token)) score += 3;
    }

    // Contextual boost if user is exploring a specific location or tribe
    if (activeTribe) {
      const atLower = activeTribe.toLowerCase();
      if (tLower.includes(atLower) || idLower.includes(atLower)) score += 35;
    }
    if (activeLocationId) {
      const alLower = activeLocationId.toLowerCase();
      if (idLower.includes(alLower)) score += 25;
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const bestMatch = scored[0];

  if (!bestMatch || bestMatch.score < 25) {
    return {
      title: "Information Not Available",
      category: "General",
      answer:
        `I don't have specific information about "${cleanQuery}" in the Ki-Khobor knowledge base.\n\n` +
        "You can ask me about:\n" +
        "• The Hornbill Festival — dates, venue, and history\n" +
        "• The 18 indigenous tribes of Nagaland and their traditions\n" +
        "• Cultural activities at Kisama Heritage Village\n" +
        "• Morungs and their significance\n" +
        "• Trekking — Dzukou Valley, Japfü Peak\n" +
        "• Any specific tribe (Angami, Ao, Konyak, Sumi, Lotha, etc.)",
      source: null,
      relatedItems: [
        { id: "what-the-hornbill-festival-is", title: "What the Hornbill Festival is", category: "festival_overview" },
        { id: "kisama-naga-heritage-village", title: "Kisama - Naga Heritage Village", category: "kisama_heritage" },
        { id: "introduction-to-nagaland-for-visitors", title: "Introduction to Nagaland", category: "festival_overview" },
      ],
    };
  }

  const primary = bestMatch.item;
  const related = scored
    .slice(1, 4)
    .filter((s) => s.score >= 25 && s.item.id !== primary.id)
    .map((s) => ({ id: s.item.id, title: s.item.title, category: s.item.category }));

  // Synthesize clean response
  let answerText = primary.content || "Information available.";

  // Append key structured attributes if present (e.g. for tribes or morungs)
  const attr = primary.attributes;
  if (attr && Object.keys(attr).length > 0) {
    const extraDetails: string[] = [];
    const regionOrDistricts = asString(attr.regionOrDistricts);
    const traditionalFestivalName = asString(attr.traditionalFestivalName);
    const festivalDateOrSeason = asString(attr.festivalDateOrSeason);
    const architecturalFeatures = asString(attr.architecturalFeatures);
    const traditionalObjectsOrDisplays = asString(attr.traditionalObjectsOrDisplays);
    const culturalSignificance = asString(attr.culturalSignificance);

    if (regionOrDistricts) extraDetails.push(`• Region/Districts: ${regionOrDistricts}`);
    if (traditionalFestivalName) extraDetails.push(`• Festival: ${traditionalFestivalName}`);
    if (festivalDateOrSeason) extraDetails.push(`• Season/Date: ${festivalDateOrSeason}`);
    if (architecturalFeatures) extraDetails.push(`• Architecture: ${architecturalFeatures}`);
    if (traditionalObjectsOrDisplays) {
      extraDetails.push(`• Traditional Displays: ${traditionalObjectsOrDisplays}`);
    }
    if (culturalSignificance && !answerText.includes(culturalSignificance)) {
      extraDetails.push(`• Significance: ${culturalSignificance}`);
    }

    if (extraDetails.length > 0 && primary.category === "tribe_profile") {
      answerText = `${answerText}\n\nKey Highlights:\n${extraDetails.join("\n")}`;
    }
  }

  return {
    title: primary.title,
    category: primary.category.replace(/_/g, " "),
    source: primary.source,
    attributes: primary.attributes,
    answer: answerText,
    relatedItems: related,
  };
}

