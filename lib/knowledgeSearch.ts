import knowledgeData from "../data/knowledgeBase.json";

export type KnowledgeItem = {
  id: string;
  title: string;
  subtitle: string | null;
  category: string;
  content: string | null;
  attributes: Record<string, any>;
  source: string | null;
};

export type SearchResponse = {
  answer: string;
  title?: string;
  category?: string;
  source?: string | null;
  attributes?: Record<string, any>;
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
    /list\s+of\s+tribes/i.test(qLower);

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

function formatTribeResponse(tribe: any, subCategory: string) {
  const tribeName = tribe.name || tribe.attributes?.tribeName || "Tribe";
  const region = tribe.regionOrDistricts || tribe.attributes?.regionOrDistricts;
  const festName = tribe.traditionalFestivalName || tribe.attributes?.traditionalFestivalName;
  const festDate = tribe.festivalDateOrSeason || tribe.attributes?.festivalDateOrSeason;
  const traditions = tribe.traditions || tribe.attributes?.traditions;
  const attire = tribe.traditionalAttire || tribe.attributes?.traditionalAttire;
  const significance = tribe.culturalSignificance || tribe.attributes?.culturalSignificance;
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

  // 1. Detect tribe count or tribe list intent
  const tribeIntent = detectTribeAggregateIntent(qLower);
  if (tribeIntent) {
    const tribes = items.filter((it) => it.category === "tribe_profile");
    tribes.sort((a, b) => a.title.localeCompare(b.title));
    const count = tribes.length;
    const cleanName = (t: KnowledgeItem) =>
      (t.attributes?.tribeName as string) || t.title.replace(/\s+Tribe$/i, "");
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
          (it.attributes?.tribeName as string)?.toLowerCase() === indIntent.tribeSlug)
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
            title: `${tribeItem.attributes?.tribeName || tribeItem.title} Morung`,
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
    if (tokens.includes("activit") || tokens.includes("activities") || tokens.includes("experience") || tokens.includes("experiences")) {
      if (idLower.includes("window-to-nagaland") || tLower.includes("window to nagaland")) {
        score += 200;
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

  if (!bestMatch || bestMatch.score < 8) {
    return {
      title: "Festival Knowledge Assistant",
      answer:
        `I could not find a specific document matching "${cleanQuery}". You can try asking about:\n\n` +
        `• "What is the Hornbill Festival?"\n` +
        `• "Tell me about the different Naga tribes and their cultures."\n` +
        `• "What can I discover at Kisama Heritage Village?"\n` +
        `• "What is a Morung?"\n` +
        `• "Dzukou Valley trek and flora"\n` +
        `• Or any specific tribe (Angami, Ao, Konyak, Sumi, Lotha, etc.)`,
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
    .filter((s) => s.score >= 10 && s.item.id !== primary.id)
    .map((s) => ({ id: s.item.id, title: s.item.title, category: s.item.category }));

  // Synthesize clean response
  let answerText = primary.content || "Information available.";

  // Append key structured attributes if present (e.g. for tribes or morungs)
  const attr = primary.attributes;
  if (attr && Object.keys(attr).length > 0) {
    const extraDetails: string[] = [];
    if (attr.regionOrDistricts) extraDetails.push(`• Region/Districts: ${attr.regionOrDistricts}`);
    if (attr.traditionalFestivalName) extraDetails.push(`• Festival: ${attr.traditionalFestivalName}`);
    if (attr.festivalDateOrSeason) extraDetails.push(`• Season/Date: ${attr.festivalDateOrSeason}`);
    if (attr.architecturalFeatures) extraDetails.push(`• Architecture: ${attr.architecturalFeatures}`);
    if (attr.traditionalObjectsOrDisplays) extraDetails.push(`• Traditional Displays: ${attr.traditionalObjectsOrDisplays}`);
    if (attr.culturalSignificance && !answerText.includes(attr.culturalSignificance)) {
      extraDetails.push(`• Significance: ${attr.culturalSignificance}`);
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

