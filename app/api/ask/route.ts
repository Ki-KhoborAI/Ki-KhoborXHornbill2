import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/db";
import { searchKnowledge } from "../../../lib/knowledgeSearch";

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
// Must fire BEFORE any DB query. Matches short, standalone greetings only.
const GREETING_PATTERN =
  /^(hi|hello|hey|howdy|greetings|good\s+morning|good\s+afternoon|good\s+evening|how\s+are\s+you|how\s+r\s+u|hiya|yo)\s*[!?.]*$/i;

function isGreeting(q: string): boolean {
  return GREETING_PATTERN.test(q.trim());
}

function greetingResponse() {
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

function eventUnavailableResponse() {
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, activeLocationId, activeTribe } = body || {};

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "A valid question string is required in the request body." },
        { status: 400 }
      );
    }

    const trimmed = question.trim();
    const qLower = trimmed.toLowerCase();

    // ── Priority 1: Greeting — short-circuit, no DB query ──
    if (isGreeting(qLower)) {
      return NextResponse.json(greetingResponse());
    }

    // 1. Attempt querying MongoDB Atlas directly
    try {
      const db = await getDatabase();
      const kiCol = db.collection("knowledge_items");
      const tribesCol = db.collection("tribes");

      // Check for tribe count or tribe list intent
      const tribeIntent = detectTribeAggregateIntent(qLower);
      if (tribeIntent) {
        const tribes = await tribesCol.find({}).sort({ name: 1 }).toArray();
        const count = tribes.length;
        const numberedList = tribes
          .map((t: any, idx: number) => `${idx + 1}. ${t.name}`)
          .join("\n");

        const answer =
          tribeIntent === "count"
            ? `According to the tribes currently represented in the Ki-Khobor database, there are ${count} records:\n\n${numberedList}`
            : `The indigenous tribes represented in the Ki-Khobor database are:\n\n${numberedList}`;

        return NextResponse.json({
          title: "The 18 Indigenous Tribes of Nagaland",
          category: "Culture & Tribes",
          answer,
          source: "Hornbill Festival Official Handbook",
          relatedItems: tribes.slice(0, 4).map((t: any) => ({
            id: `tribe-${t.slug}`,
            title: `${t.name} Tribe`,
            category: "tribe_profile",
          })),
        });
      }

      // Check for individual tribe inquiry (geography, festival, traditions, attire, cultural significance, overview)
      const indIntent = detectIndividualTribeIntent(qLower);
      if (indIntent) {
        const tribe = await tribesCol.findOne({ slug: indIntent.tribeSlug });
        if (tribe) {
          const formatted = formatTribeResponse(tribe, indIntent.subCategory);
          return NextResponse.json({
            title: formatted.title,
            category: formatted.category,
            answer: formatted.answer,
            source: formatted.source,
            relatedItems: [
              {
                id: `morungs-overview-${tribe.slug}-morung`,
                title: `${tribe.name} Morung`,
                category: "morungs_overview",
              },
              {
                id: "kisama-naga-heritage-village",
                title: "Kisama Heritage Village",
                category: "kisama_heritage",
              },
            ],
          });
        }
      }

      // Check for event schedule inquiry
      if (detectEventScheduleIntent(qLower)) {
        return NextResponse.json(eventUnavailableResponse());
      }

      // Tokenize and expand synonyms
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

      // Fetch all knowledge items from Atlas
      const items = await kiCol.find({}).toArray();

      const scored = items.map((item: any) => {
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
        if (rawTokens.includes("where") || rawTokens.includes("location") || rawTokens.includes("located") || rawTokens.includes("venue")) {
          if (slug === "location" || t === "location") score += 140;
          if (slug.includes("kisama") || t.includes("kisama")) score += 60;
        }

        if (rawTokens.includes("when") || rawTokens.includes("date") || rawTokens.includes("dates") || rawTokens.includes("timing") || rawTokens.includes("timings")) {
          if (slug.includes("date") || t.includes("date")) score += 140;
          if (slug.includes("timing") || t.includes("timing")) score += 100;
        }

        if (rawTokens.includes("who") || rawTokens.includes("organizer") || rawTokens.includes("organises") || rawTokens.includes("organized")) {
          if (slug.includes("organise") || t.includes("organise")) score += 140;
        }

        if (rawTokens.includes("morung") || rawTokens.includes("morungs") || qLower.includes("morung")) {
          const specificTribe = hasSpecificTribe(qLower);
          if (specificTribe) {
            const targetSlug = specificTribe === "sumi" ? "morungs-overview-sumi-sema-morung" : `morungs-overview-${specificTribe}-morung`;
            if (slug === targetSlug) {
              score += 400;
            } else if ((slug.includes(specificTribe) || t.includes(specificTribe)) && (slug.includes("morung") || t.includes("morung"))) {
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
        if (rawTokens.includes("activit") || rawTokens.includes("activities") || rawTokens.includes("experience") || rawTokens.includes("experiences")) {
          if (slug.includes("window-to-nagaland") || t.includes("window to nagaland")) {
            score += 200;
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

      scored.sort((a: any, b: any) => b.score - a.score);
      const topMatch = scored[0];

      if (topMatch && topMatch.score >= 12) {
        const primary = topMatch.item;
        const related = scored
          .slice(1, 4)
          .filter((s: any) => s.score >= 15 && s.item._id.toString() !== primary._id.toString())
          .map((s: any) => ({
            id: s.item.slug,
            title: s.item.title,
            category: s.item.category,
          }));

        return NextResponse.json({
          title: primary.title,
          category: (primary.category || "").replace(/_/g, " "),
          answer: primary.content || "Information available.",
          source: primary.source || null,
          attributes: primary.attributes || {},
          relatedItems: related,
        });
      }
    } catch (dbErr) {
      console.warn("[API Ask] Atlas connection note, using local dataset fallback:", dbErr);
    }

    // 2. Fallback to local knowledge search if Atlas query yields low score or is offline
    const localResult = searchKnowledge(trimmed, activeLocationId, activeTribe);
    return NextResponse.json(localResult);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to query knowledge base", details: String(error) },
      { status: 500 }
    );
  }
}
