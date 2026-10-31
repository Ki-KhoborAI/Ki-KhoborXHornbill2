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

export function searchKnowledge(
  query: string,
  activeLocationId?: string | null,
  activeTribe?: string | null
): SearchResponse {
  const cleanQuery = query.trim();
  const qLower = cleanQuery.toLowerCase();

  // 1. Detect multi-tribe inquiry intent
  if (
    qLower.includes("different tribes") ||
    qLower.includes("all tribes") ||
    qLower.includes("naga tribes and their") ||
    qLower.includes("what are the tribes") ||
    qLower.includes("list of tribes") ||
    (qLower.includes("tribes") && !qLower.includes("morung"))
  ) {
    const tribes = items.filter((it) => it.category === "tribe_profile");
    const tribeNames = tribes
      .map((t) => {
        const fest = t.attributes?.traditionalFestivalName?.split(":")[0] || "Festival";
        return `• ${t.title.replace(" Tribe", "")} (Festival: ${fest})`;
      })
      .join("\n");

    return {
      title: "The 18 Indigenous Tribes of Nagaland",
      category: "Culture & Tribes",
      answer:
        `Nagaland is celebrated as the "Land of Festivals" and is home to 18 officially recognized indigenous tribes. Each tribe possesses its own unique dialect, traditional attire, woven shawl motifs, folk heritage, and seasonal agricultural festivals:\n\n` +
        tribeNames +
        `\n\nDuring the annual Hornbill Festival at Kisama Heritage Village, all 18 tribes come together, each occupying their authentic traditional Morung (dormitory) to showcase their living folklore, dances, and cuisines.`,
      relatedItems: tribes.slice(0, 4).map((t) => ({ id: t.id, title: t.title, category: t.category })),
    };
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

