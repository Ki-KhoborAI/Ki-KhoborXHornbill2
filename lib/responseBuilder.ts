import { GEMINI_MODEL, getGeminiClient } from "./gemini";
import { usableKnowledgeText } from "./knowledgeQuality";
import {
  NAGA_TRIBE_SLUGS,
  NON_NAGA_INDIGENOUS_TRIBE_SLUGS,
  OFFICIAL_NAGA_TRIBE_COUNT,
  OFFICIAL_NON_NAGA_INDIGENOUS_TRIBE_COUNT,
  TRIBE_NAMES,
} from "./tribesData";
import {
  asString,
  tribeString,
  type AssistantResponse,
  type ConversationTurn,
  type RetrievedRecord,
  type TribeLike,
} from "./types";

const OFFICIAL_TRIBES_BULLET =
  `• Official Naga tribes (${OFFICIAL_NAGA_TRIBE_COUNT}) and Recognised Non-Naga indigenous tribes (${OFFICIAL_NON_NAGA_INDIGENOUS_TRIBE_COUNT})`;

function numberedOfficialTribeNames(slugs: readonly string[]): string {
  return slugs
    .map((slug, idx) => `${idx + 1}. ${TRIBE_NAMES[slug] || slug}`)
    .join("\n");
}

/** Prefer flat/attribute tribe text, but never surface corrupted serialization. */
function usableTribeField(
  flat: string | null | undefined,
  attributes: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  return usableKnowledgeText(tribeString(flat, attributes, key));
}

// ---------------------------------------------------------------------------
// Controlled responses (Zero DB / Zero hallucination)
// ---------------------------------------------------------------------------

export function buildGreetingResponse(): AssistantResponse {
  return {
    title: "Ki-Khobor Assistant",
    category: "General",
    answer:
      "Namaste! 🎉 Welcome to Ki-Khobor — your guide to the Hornbill Festival 2026 and the cultures of Nagaland.\n\n" +
      "You can ask me about:\n" +
      "• The Hornbill Festival — dates, venue, history\n" +
      `${OFFICIAL_TRIBES_BULLET}\n` +
      "• Traditional festivals, attire, and customs\n" +
      "• Morungs at Kisama Heritage Village\n" +
      "• Dzukou Valley trek and natural attractions",
    source: null,
    relatedItems: [
      { id: "what-the-hornbill-festival-is", title: "What the Hornbill Festival is", category: "festival_overview" },
      { id: "kisama-naga-heritage-village", title: "Kisama Heritage Village", category: "kisama_heritage" },
      { id: "introduction-to-nagaland-for-visitors", title: "Introduction to Nagaland", category: "festival_overview" },
    ],
    dataSourceUsed: "controlled",
  };
}

export function buildIdentityResponse(): AssistantResponse {
  return {
    title: "About Ki-Khobor",
    category: "About",
    answer:
      "I am Ki-Khobor (meaning 'What's the News / Greetings'), the AI information assistant for the Hornbill Festival 2026.\n\n" +
      "I can assist you with:\n" +
      `• Detailed profiles of Official Naga tribes (${OFFICIAL_NAGA_TRIBE_COUNT}) and Recognised Non-Naga indigenous tribes (${OFFICIAL_NON_NAGA_INDIGENOUS_TRIBE_COUNT})\n` +
      "• Kisama Heritage Village and its tribal Morungs\n" +
      "• Hornbill Festival dates, venue, and cultural events\n" +
      "• Traditional attire, music, crafts, and festivals\n" +
      "• Trekking, nature, and adventure destinations like Dzukou Valley\n\n" +
      "How can I help you explore Nagaland today?",
    source: null,
    relatedItems: [
      { id: "what-the-hornbill-festival-is", title: "What the Hornbill Festival is", category: "festival_overview" },
      { id: "kisama-naga-heritage-village", title: "Kisama Heritage Village", category: "kisama_heritage" },
    ],
    dataSourceUsed: "controlled",
  };
}

export function buildPrivateInfoResponse(): AssistantResponse {
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
    dataSourceUsed: "controlled",
  };
}

export function buildPoliticalResponse(): AssistantResponse {
  return {
    title: "Out of Scope",
    category: "General",
    answer:
      "Information about current government officials, political matters, and elected representatives is outside the scope of the Ki-Khobor knowledge base.\n\n" +
      "For verified and up-to-date information, please consult official Government of Nagaland sources or reputable news outlets.\n\n" +
      "I can help you with:\n" +
      "• The Hornbill Festival — venue, dates, and history\n" +
      `${OFFICIAL_TRIBES_BULLET} and their traditions\n` +
      "• Cultural activities at Kisama Heritage Village\n" +
      "• Morungs and their significance\n" +
      "• Trekking and adventure experiences around Nagaland",
    source: null,
    relatedItems: [
      { id: "what-the-hornbill-festival-is", title: "What the Hornbill Festival is", category: "festival_overview" },
      { id: "kisama-naga-heritage-village", title: "Kisama - Naga Heritage Village", category: "kisama_heritage" },
      { id: "introduction-to-nagaland-for-visitors", title: "Introduction to Nagaland", category: "festival_overview" },
    ],
    dataSourceUsed: "controlled",
  };
}

export function buildPackingUnavailableResponse(): AssistantResponse {
  return {
    title: "Information Not Available",
    category: "General",
    answer:
      "A specific visitor packing list or gear guide is not currently available in the Ki-Khobor knowledge base.\n\n" +
      "Generally, Nagaland in December experiences cool to cold winter temperatures, especially in the evenings at Kisama (elevation ~1,400m). Visitors typically recommend carrying warm layers, comfortable walking shoes for hilly terrain, and necessary personal essentials.\n\n" +
      "You can ask me about:\n" +
      "• The Hornbill Festival — dates, venue, history\n" +
      `${OFFICIAL_TRIBES_BULLET}\n` +
      "• Cultural activities at Kisama Heritage Village\n" +
      "• Morungs and their significance\n" +
      "• Trekking — Dzukou Valley, Japfü Peak",
    source: null,
    relatedItems: [
      { id: "what-the-hornbill-festival-is", title: "What the Hornbill Festival is", category: "festival_overview" },
      { id: "kisama-naga-heritage-village", title: "Kisama Heritage Village", category: "kisama_heritage" },
      { id: "geography-basics-climate-best-time-to-visit", title: "Best time to visit", category: "geography_basics" },
    ],
    dataSourceUsed: "controlled",
  };
}

export function buildFestivalActivitiesResponse(): AssistantResponse {
  return {
    title: "Things to Do at the Hornbill Festival",
    category: "Festival Overview",
    answer:
      "The Hornbill Festival — the Festival of Festivals — offers a wide range of experiences for visitors:\n\n" +
      `• **Cultural Performances**: Witness traditional dances, songs, and ceremonies by Official Naga tribes and Recognised Non-Naga indigenous communities at Kisama Heritage Village.\n` +
      "• **Hornbill Music Festival**: Enjoy live performances blending traditional Naga music with contemporary artists.\n" +
      "• **Traditional Sports**: Watch and participate in indigenous Naga sports and games.\n" +
      "• **Food Festival**: Taste authentic Naga cuisine, traditional smoked meats, rice beer, and more.\n" +
      "• **Craft & Handloom Sales**: Browse and buy traditional Naga shawls, cane-bamboo crafts, and handloom textiles.\n" +
      "• **Morung Visits**: Explore tribal morungs (traditional dormitories) at Kisama, each showcasing tribal architecture and artefacts.\n" +
      "• **Adventure Activities**: Trekking in Dzukou Valley, village walks in Khonoma, offroading, and heritage walks are available nearby.\n\n" +
      "Note: The detailed 2026 event programme and daily schedule will be published closer to the festival dates. Check the official Hornbill Festival website for updates.",
    source: "Hornbill Festival 2025 Final Handbook, p. PDF idx 3-4",
    relatedItems: [
      { id: "kisama-heritage-venue-kisama-naga-heritage-village", title: "Kisama - Naga Heritage Village", category: "kisama_heritage" },
      { id: "adventure-trekking-trekking-dzukou-valley-trek", title: "Dzukou Valley Trek", category: "adventure_trekking" },
      { id: "morungs-overview-kisama-heritage-village-general-morung-description", title: "Kisama Heritage Village - General Morung Description", category: "morungs_overview" },
    ],
    dataSourceUsed: "controlled",
  };
}

export function buildMissingInfoResponse(query: string): AssistantResponse {
  return {
    title: "Information Not Available",
    category: "General",
    answer:
      `I don't have specific information about "${query}" in the Ki-Khobor knowledge base.\n\n` +
      "You can ask me about:\n" +
      "• The Hornbill Festival — dates, venue, and history\n" +
      `${OFFICIAL_TRIBES_BULLET} and their traditions\n` +
      "• Cultural activities at Kisama Heritage Village\n" +
      "• Morungs and their significance\n" +
      "• Trekking — Dzukou Valley, Japfü Peak\n" +
      "• Any specific tribe (Angami, Ao, Konyak, Sumi, Lotha, etc.)",
    source: null,
    relatedItems: [
      { id: "what-the-hornbill-festival-is", title: "What the Hornbill Festival is", category: "festival_overview" },
      { id: "kisama-naga-heritage-village", title: "Kisama Heritage Village", category: "kisama_heritage" },
      { id: "introduction-to-nagaland-for-visitors", title: "Introduction to Nagaland", category: "festival_overview" },
    ],
    dataSourceUsed: "controlled",
  };
}

// ---------------------------------------------------------------------------
// Tribe Formatting
// ---------------------------------------------------------------------------

export type TribeSubCategory =
  | "geography"
  | "festival"
  | "attire"
  | "traditions"
  | "cultural_significance"
  | "overview";

export function detectTribeSubCategory(query: string): TribeSubCategory {
  const qLower = query.toLowerCase();

  if (/where\s+(do|are|is|live)|district|region|inhabit|geograph/i.test(qLower)) {
    return "geography";
  }
  if (/attire|dress|cloth(es|ing)?|wear|costume|shawl/i.test(qLower)) {
    return "attire";
  }
  if (/significance|important|importance|why\s+is\s+.*important/i.test(qLower)) {
    return "cultural_significance";
  }
  if (/festival|celebrat|when\s+is|timing|dates?/i.test(qLower)) {
    return "festival";
  }
  if (/tradition|custom|practice|ritual/i.test(qLower)) {
    return "traditions";
  }
  return "overview";
}

export function formatTribeResponse(
  tribe: TribeLike,
  subCategory: TribeSubCategory,
  sourceProvider: "atlas" | "local" = "atlas"
): AssistantResponse {
  const attrs = tribe.attributes;
  const tribeName =
    usableTribeField(tribe.name, attrs, "tribeName") || "Tribe";
  const slug = tribe.slug || tribe.id?.replace(/^tribe-/, "") || "";
  const region = usableTribeField(
    tribe.regionOrDistricts,
    attrs,
    "regionOrDistricts"
  );
  const festName = usableTribeField(
    tribe.traditionalFestivalName,
    attrs,
    "traditionalFestivalName"
  );
  const festDate = usableTribeField(
    tribe.festivalDateOrSeason,
    attrs,
    "festivalDateOrSeason"
  );
  const traditions = usableTribeField(tribe.traditions, attrs, "traditions");
  const attire = usableTribeField(
    tribe.traditionalAttire,
    attrs,
    "traditionalAttire"
  );
  const significance = usableTribeField(
    tribe.culturalSignificance,
    attrs,
    "culturalSignificance"
  );
  const source = tribe.source || "Hornbill Festival Official Handbook";

  let title = `${tribeName} Tribe`;
  let answer: string;

  switch (subCategory) {
    case "geography":
      title = `${tribeName} Tribe · Region & Districts`;
      answer = region
        ? `The ${tribeName} people primarily inhabit ${region}.`
        : `The geographic and district information for the ${tribeName} tribe is not currently available in our database.`;
      break;

    case "festival":
      title = `${tribeName} Tribe · Traditional Festival`;
      if (festName && festDate) {
        answer = `The traditional festival of the ${tribeName} tribe is ${festName}.\n\nFestival Date / Season: ${festDate}`;
      } else if (festName) {
        answer = `The traditional festival of the ${tribeName} tribe is ${festName}.`;
      } else if (festDate) {
        answer = `The traditional festival of the ${tribeName} tribe is observed during: ${festDate}.`;
      } else {
        answer = `The traditional festival information for the ${tribeName} tribe is not currently available in our database.`;
      }
      break;

    case "attire":
      title = `${tribeName} Tribe · Traditional Attire`;
      answer = attire
        ? attire
        : `The traditional attire information for the ${tribeName} tribe is not currently available in our database.`;
      break;

    case "traditions":
      title = `${tribeName} Tribe · Traditions & Customs`;
      answer = traditions
        ? traditions
        : `The traditions and customs information for the ${tribeName} tribe is not currently available in our database.`;
      break;

    case "cultural_significance":
      title = `${tribeName} Tribe · Cultural Significance`;
      answer = significance
        ? significance
        : `The cultural significance information for the ${tribeName} tribe is not currently available in our database.`;
      break;

    case "overview":
    default: {
      const details: string[] = [];
      if (region) details.push(`• Region / Districts: ${region}`);
      if (festName) details.push(`• Traditional Festival: ${festName}`);
      if (festDate) details.push(`• Festival Date / Season: ${festDate}`);
      if (significance) details.push(`\nCultural Significance:\n${significance}`);
      if (traditions) details.push(`\nTraditions & Customs:\n${traditions}`);

      answer =
        details.length > 0
          ? `The ${tribeName} tribe is one of the recognized indigenous tribes of Nagaland.\n\n${details.join("\n")}`
          : `The ${tribeName} tribe is one of the recognized indigenous tribes of Nagaland. Detailed records are currently being updated in our database.`;
      break;
    }
  }

  return {
    title,
    category: "Culture & Tribes",
    answer,
    source,
    relatedItems: [
      {
        id: `morungs-overview-${slug}-morung`,
        title: `${tribeName} Morung`,
        category: "morungs_overview",
      },
      {
        id: "kisama-naga-heritage-village",
        title: "Kisama Heritage Village",
        category: "kisama_heritage",
      },
    ],
    dataSourceUsed: sourceProvider,
  };
}

/** Stall document shape stored in Mongo `stalls_information`. */
export type StallCatalogDoc = {
  slug?: string;
  stallName?: string;
  location?: {
    stallNumberAndZone?: string;
    area?: string;
    landmark?: string;
  };
  tribeOrGroup?: string;
  inCharge?: { name?: string; role?: string };
  contact?: { phone?: string; whatsapp?: boolean };
  hours?: string;
  paymentMethods?: string[];
  paymentNotes?: string;
  signatureDishes?: string[];
  cuisineType?: string;
  keyIngredients?: string[];
  menu?: Array<{
    dish?: string;
    type?: string;
    priceInr?: number;
    ingredients?: string[];
    spiceLevel?: string;
  }>;
  menuStatus?: string;
  menuNotes?: string;
  priceRangeInr?: { min?: number; max?: number };
  allergenAdvisory?: string;
  takeaway?: {
    available?: boolean;
    dineInAvailable?: boolean;
    notes?: string;
  };
  verification?: {
    verifiedBy?: string;
    designation?: string;
    dateAsOnSheet?: string;
  };
  publicationNote?: string;
};

/** Artist document shape stored in Mongo `artist_lineup` (flexible for future fields). */
export type ArtistLineupDoc = {
  slug?: string;
  name?: string;
  artistName?: string;
  title?: string;
  day?: string;
  date?: string;
  stage?: string;
  venue?: string;
  genre?: string;
  bio?: string;
  description?: string;
  notes?: string;
};

function stallDisplayName(stall: StallCatalogDoc): string {
  return (stall.stallName || stall.slug || "Unnamed stall").trim();
}

export function findMatchingStall(
  stalls: StallCatalogDoc[],
  query: string
): StallCatalogDoc | null {
  const q = query.toLowerCase();
  const scored = stalls
    .map((stall) => {
      const name = stallDisplayName(stall).toLowerCase();
      const slug = (stall.slug || "").toLowerCase();
      let score = 0;
      if (name && q.includes(name)) score += 100;
      if (slug && q.includes(slug.replace(/-/g, " "))) score += 90;
      if (slug && q.includes(slug)) score += 80;
      // Partial token overlap on stall name words longer than 3 chars
      for (const part of name.split(/\s+/)) {
        if (part.length > 3 && q.includes(part)) score += 20;
      }
      return { stall, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.stall ?? null;
}

export function formatStallListResponse(
  stalls: StallCatalogDoc[],
  sourceProvider: "atlas" | "local" = "atlas"
): AssistantResponse {
  if (stalls.length === 0) {
    return {
      title: "Food Stalls",
      category: "Stalls",
      answer:
        "Food stall information for Hornbill Festival 2026 is not available in the catalogue yet.",
      source: "Ki-Khobor stalls catalogue",
      relatedItems: [],
      dataSourceUsed: sourceProvider,
    };
  }

  const sorted = [...stalls].sort((a, b) =>
    stallDisplayName(a).localeCompare(stallDisplayName(b))
  );
  const lines = sorted.map((stall, idx) => {
    const zone = stall.location?.stallNumberAndZone || "Zone not listed";
    const specialty =
      stall.signatureDishes?.[0] || stall.cuisineType || "Specialty not listed";
    return `${idx + 1}. ${stallDisplayName(stall)} — ${zone}\n   Specialty: ${specialty}`;
  });

  const answer =
    `Here are the food stalls currently available in the Ki-Khobor catalogue (${sorted.length}):\n\n` +
    `${lines.join("\n\n")}\n\n` +
    `Ask about a specific stall by name for menu, prices, contact, and payment details.`;

  return {
    title: "Food Stalls at Hornbill Festival 2026",
    category: "Stalls",
    answer,
    source: "Ki-Khobor Official Food Stall Data Collection",
    relatedItems: sorted.slice(0, 4).map((stall) => ({
      id: `stall-${stall.slug || stallDisplayName(stall)}`,
      title: stallDisplayName(stall),
      category: "stall",
    })),
    dataSourceUsed: sourceProvider,
  };
}

export function formatStallDetailResponse(
  stall: StallCatalogDoc,
  sourceProvider: "atlas" | "local" = "atlas"
): AssistantResponse {
  const name = stallDisplayName(stall);
  const parts: string[] = [`**${name}**`];

  if (stall.location?.stallNumberAndZone) {
    parts.push(`Location / Zone: ${stall.location.stallNumberAndZone}`);
  }
  if (stall.tribeOrGroup) {
    parts.push(`Tribe / Group: ${stall.tribeOrGroup}`);
  }
  if (stall.inCharge?.name) {
    parts.push(
      `In-charge: ${stall.inCharge.name}${
        stall.inCharge.role ? ` (${stall.inCharge.role})` : ""
      }`
    );
  }
  if (stall.contact?.phone) {
    parts.push(
      `Contact: ${stall.contact.phone}${
        stall.contact.whatsapp ? " (WhatsApp)" : ""
      }`
    );
  }
  if (stall.hours) parts.push(`Hours: ${stall.hours}`);
  if (stall.paymentNotes) {
    parts.push(`Payment: ${stall.paymentNotes}`);
  } else if (stall.paymentMethods?.length) {
    parts.push(`Payment: ${stall.paymentMethods.join(", ")}`);
  }
  if (stall.cuisineType) parts.push(`Cuisine: ${stall.cuisineType}`);
  if (stall.signatureDishes?.length) {
    parts.push(`Signature dishes:\n${stall.signatureDishes.map((d) => `• ${d}`).join("\n")}`);
  }
  if (stall.keyIngredients?.length) {
    parts.push(`Key ingredients: ${stall.keyIngredients.join(", ")}`);
  }

  if (stall.menu?.length) {
    const menuLines = stall.menu.map((item) => {
      const price =
        typeof item.priceInr === "number" ? ` — ₹${item.priceInr}` : "";
      const type = item.type ? ` (${item.type})` : "";
      const spice = item.spiceLevel ? ` | Spice: ${item.spiceLevel}` : "";
      const ingredients = item.ingredients?.length
        ? ` | ${item.ingredients.join(", ")}`
        : "";
      return `• ${item.dish || "Item"}${type}${price}${spice}${ingredients}`;
    });
    parts.push(`Menu:\n${menuLines.join("\n")}`);
  } else if (stall.menuStatus === "to_be_confirmed" || stall.menuNotes) {
    parts.push(
      stall.menuNotes ||
        "Full menu items are still to be confirmed with the stall."
    );
    if (stall.priceRangeInr?.min != null && stall.priceRangeInr?.max != null) {
      parts.push(
        `Indicative price range: ₹${stall.priceRangeInr.min}–₹${stall.priceRangeInr.max}`
      );
    }
  }

  if (stall.allergenAdvisory) {
    parts.push(`Allergy advisory: ${stall.allergenAdvisory}`);
  }
  if (stall.takeaway?.notes) {
    parts.push(stall.takeaway.notes);
  } else if (stall.takeaway?.available) {
    parts.push("Takeaway is available.");
  }
  if (stall.verification?.verifiedBy) {
    parts.push(
      `Verified by: ${stall.verification.verifiedBy}${
        stall.verification.dateAsOnSheet
          ? ` · ${stall.verification.dateAsOnSheet}`
          : ""
      }`
    );
  }
  if (stall.publicationNote) {
    parts.push(`Note: ${stall.publicationNote}`);
  }

  return {
    title: name,
    category: "Stalls",
    answer: parts.join("\n\n"),
    source: "Ki-Khobor Official Food Stall Data Collection",
    relatedItems: [
      {
        id: `stall-${stall.slug || name}`,
        title: name,
        category: "stall",
      },
    ],
    dataSourceUsed: sourceProvider,
  };
}

function artistDisplayName(artist: ArtistLineupDoc): string {
  return (
    artist.artistName ||
    artist.name ||
    artist.title ||
    artist.slug ||
    "Unnamed artist"
  ).trim();
}

export function formatArtistLineupResponse(
  artists: ArtistLineupDoc[],
  sourceProvider: "atlas" | "local" = "atlas"
): AssistantResponse {
  if (artists.length === 0) {
    return {
      title: "Artist Lineup",
      category: "Artist Lineup",
      answer:
        "The artist lineup catalogue is ready, but no artist entries have been added yet. Check back once the official Hornbill Festival 2026 lineup is published in Ki-Khobor.",
      source: "Ki-Khobor artist lineup catalogue",
      relatedItems: [],
      dataSourceUsed: sourceProvider,
    };
  }

  const sorted = [...artists].sort((a, b) =>
    artistDisplayName(a).localeCompare(artistDisplayName(b))
  );
  const lines = sorted.map((artist, idx) => {
    const bits = [artistDisplayName(artist)];
    if (artist.day || artist.date) bits.push([artist.day, artist.date].filter(Boolean).join(" · "));
    if (artist.stage || artist.venue) bits.push(artist.stage || artist.venue || "");
    if (artist.genre) bits.push(artist.genre);
    return `${idx + 1}. ${bits.filter(Boolean).join(" — ")}`;
  });

  return {
    title: "Artist Lineup — Hornbill Festival 2026",
    category: "Artist Lineup",
    answer: `Here is the artist lineup currently in the Ki-Khobor catalogue (${sorted.length}):\n\n${lines.join("\n")}`,
    source: "Ki-Khobor artist lineup catalogue",
    relatedItems: sorted.slice(0, 4).map((artist) => ({
      id: `artist-${artist.slug || artistDisplayName(artist)}`,
      title: artistDisplayName(artist),
      category: "artist_lineup",
    })),
    dataSourceUsed: sourceProvider,
  };
}

export function formatTribeAggregateResponse(
  tribes: TribeLike[],
  intent: "count" | "list",
  sourceProvider: "atlas" | "local" = "atlas"
): AssistantResponse {
  const cleanName = (t: TribeLike) =>
    t.name ||
    asString(t.attributes?.tribeName) ||
    t.title?.replace(/\s+Tribe$/i, "") ||
    t.slug ||
    "";

  const sorted = [...tribes].sort((a, b) => cleanName(a).localeCompare(cleanName(b)));
  const nagaList = numberedOfficialTribeNames(NAGA_TRIBE_SLUGS);
  const nonNagaList = numberedOfficialTribeNames(NON_NAGA_INDIGENOUS_TRIBE_SLUGS);

  const intro =
    intent === "count"
      ? `Nagaland officially recognises ${OFFICIAL_NAGA_TRIBE_COUNT} Official Naga Tribes and ${OFFICIAL_NON_NAGA_INDIGENOUS_TRIBE_COUNT} Recognised Non-Naga indigenous tribes.`
      : `Here are Nagaland’s officially recognised indigenous communities, grouped clearly:`;

  const answer =
    `${intro}\n\n` +
    `Official Naga Tribes (${OFFICIAL_NAGA_TRIBE_COUNT}):\n${nagaList}\n\n` +
    `Recognised Non-Naga Indigenous Tribes (${OFFICIAL_NON_NAGA_INDIGENOUS_TRIBE_COUNT}):\n${nonNagaList}\n\n` +
    `Note: Hornbill Festival cultural programmes commonly feature 18 troupes (the ${OFFICIAL_NAGA_TRIBE_COUNT} Official Naga Tribes plus Garo, Kachari and Kuki). Mikir is also a Recognised Non-Naga indigenous tribe.`;

  return {
    title: "Indigenous Tribes of Nagaland",
    category: "Culture & Tribes",
    answer,
    source: "Govt. of Nagaland / IPR Basic Facts; Hornbill Festival Official Handbook",
    relatedItems: sorted.slice(0, 4).map((t) => ({
      id: `tribe-${t.slug || t.id}`,
      title: `${cleanName(t)} Tribe`,
      category: "tribe_profile",
    })),
    dataSourceUsed: sourceProvider,
  };
}

// ---------------------------------------------------------------------------
// Gemini Response Synthesis (Grounded in Retrieved Context)
// ---------------------------------------------------------------------------

export async function synthesizeGroundedResponse(
  question: string,
  records: RetrievedRecord[],
  conversationHistory: ConversationTurn[] = [],
  sourceProvider: "atlas" | "local" = "atlas"
): Promise<AssistantResponse> {
  if (records.length === 0) {
    return buildMissingInfoResponse(question);
  }

  const primary = records[0];
  const contextBlocks = records.map((r) => {
    let block = `[TITLE: ${r.title} | CATEGORY: ${r.category}]\n${r.content}`;
    if (r.attributes && Object.keys(r.attributes).length > 0) {
      block += `\nAttributes: ${JSON.stringify(r.attributes)}`;
    }
    return block;
  }).join("\n\n---\n\n");

  // Format recent conversation history for prompt
  const historyText = conversationHistory
    .slice(-4)
    .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
    .join("\n");

  const prompt = `You are an AI assistant for the Ki-Khobor × Hornbill Festival 2026 platform.
Answer the user's question accurately, concisely, and politely using ONLY the verified knowledge base context below.

STRICT INSTRUCTIONS:
1. Answer using ONLY the facts present in the CONTEXT below.
2. Do NOT use outside training data to invent festival dates, tribal information, performers, or schedules.
3. If the user's specific inquiry is NOT covered in the context, say clearly: "I don't have that specific information in the Ki-Khobor knowledge base."
4. If a field in the context is listed as missing or not available, state that honestly rather than guessing.
5. Keep your tone informative, warm, and respectful of Naga culture.
6. Distinguish historical edition years (for example, 2025 handbook details) from unconfirmed future editions. Never present 2025 schedules, ceremonies, or timings as the confirmed 2026 programme.
7. If context marks dates or claims as unverified, unconfirmed, or requiring official confirmation, say so clearly and do not restate them as official facts.

${historyText ? `RECENT CONVERSATION:\n${historyText}\n\n` : ""}KNOWLEDGE BASE CONTEXT:
${contextBlocks}

USER QUESTION:
${question}`;

  try {
    const gemini = getGeminiClient();
    const callPromise = gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("Gemini response timeout")), 8000);
      if (typeof timer.unref === "function") timer.unref();
    });

    const response = await Promise.race([callPromise, timeoutPromise]);
    const answer = response.text?.trim() || primary.content || "Information available.";

    const relatedItems = records.slice(1, 4).map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
    }));

    return {
      title: primary.title,
      category: primary.category.replace(/_/g, " "),
      answer,
      source: primary.source || "Hornbill Festival Official Handbook",
      attributes: primary.attributes,
      relatedItems,
      dataSourceUsed: sourceProvider,
    };
  } catch (err) {
    console.warn("[ResponseBuilder] Gemini synthesis failed/timed out, falling back to direct document text:", err);
    // Fall back to clean primary document content without LLM rewrite
    const relatedItems = records.slice(1, 4).map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
    }));

    return {
      title: primary.title,
      category: primary.category.replace(/_/g, " "),
      answer: primary.content || "Information available.",
      source: primary.source || "Hornbill Festival Official Handbook",
      attributes: primary.attributes,
      relatedItems,
      dataSourceUsed: sourceProvider,
    };
  }
}
