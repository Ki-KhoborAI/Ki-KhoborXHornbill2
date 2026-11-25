export type VerificationStatus =
  | "verified"
  | "needs-review"
  | "not-started"
  | "not-provided";

export type ExperienceSectionKey =
  | "history"
  | "culture"
  | "traditionalAttire"
  | "food"
  | "crafts"
  | "music"
  | "traditions"
  // Retain the previous flexible section keys for existing integrations.
  | "introduction"
  | "tribe"
  | "stories"
  | "people"
  | "events"
  | "navigation";

export type LocationSource = {
  label: string;
  reference?: string;
  verificationStatus: VerificationStatus;
  /** Original workbook wording where a row has an explicit review status. */
  reviewStatus?: "Extracted - Needs Review" | "Not Started" | "Verified";
};

export type LocationMedia = {
  type: "image" | "audio" | "video";
  src: string;
  alt?: string;
  verificationStatus?: VerificationStatus;
};

export type Location = {
  id: string;
  name: string;
  tribeName?: string;
  tribeIntroduction?: string;
  category?: string;
  description?: string;
  image?: string | null;
  availability?: "available" | "incomplete" | "coming-soon";
  verificationStatus?: VerificationStatus;
  /** Legacy status field retained for compatibility with existing consumers. */
  reviewStatus?: VerificationStatus;
  sections?: Partial<Record<ExperienceSectionKey, string[]>>;
  sectionVerificationStatus?: Partial<
    Record<ExperienceSectionKey, VerificationStatus>
  >;
  questions?: string[];
  media?: LocationMedia[];
  relatedEvents?: { title: string; description?: string }[];
  navigation?: {
    venue?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  source?: LocationSource[];
  /** Legacy plural field retained for compatibility with existing consumers. */
  sources?: LocationSource[];
};

const morungSectionKeys: ExperienceSectionKey[] = [
  "history",
  "culture",
  "traditionalAttire",
  "food",
  "crafts",
  "music",
  "traditions",
];

function createMorung(id: string, tribeName: string): Location {
  return {
    id,
    name: `${tribeName} Morung`,
    tribeName,
    category: "TRIBAL CULTURE",
    description: "More information coming soon.",
    image: null,
    availability: "coming-soon",
    verificationStatus: "not-started",
    reviewStatus: "not-started",
    sections: Object.fromEntries(
      morungSectionKeys.map((key) => [key, []])
    ) as NonNullable<Location["sections"]>,
    sectionVerificationStatus: Object.fromEntries(
      morungSectionKeys.map((key) => [key, "not-started"])
    ) as NonNullable<Location["sectionVerificationStatus"]>,
    questions: [
      `What verified information is available about the ${tribeName} Morung?`,
      "What can I see at this Morung?",
      `Tell me something about the ${tribeName} people.`,
      "What is happening at Hornbill?",
      "Explore other Morungs",
    ],
    media: [],
    relatedEvents: [],
    navigation: { venue: "Kisama Heritage Village, Nagaland" },
    source: [],
  };
}

/**
 * The route IDs and tribe labels below follow the explicit user-provided list.
 * The workbook's individual Morung narratives are not populated because their
 * source/status is missing and its Missing Information tab flags them as
 * unconfirmed.
 *
 * Existing QR destinations use `/experience/{id}` for the original 17 Morungs.
 * Those IDs must not be renamed. International Morung is an additive 18th entry.
 */
export const targetMorungCount = 18;

export const locations: Record<string, Location> = {
  angami: {
    ...createMorung("angami", "Angami"),
    // Keep established Angami card photograph; new batch did not replace it.
    image: "/images/morungs/angami-card.jpg",
    tribeIntroduction:
      "The Angami are one of Nagaland’s major Naga tribes, with their own distinct language, traditions and cultural celebrations. Their principal festival, Sekrenyi, is associated with purification, renewal, feasting and song.",
  },
  ao: {
    ...createMorung("ao", "Ao"),
    image: "/images/morungs/ao.webp",
  },
  chakhesang: {
    ...createMorung("chakhesang", "Chakhesang"),
    image: "/images/morungs/chakhesang.webp",
  },
  chang: {
    ...createMorung("chang", "Chang"),
    image: "/images/morungs/chang.webp",
  },
  khiamniungan: createMorung("khiamniungan", "Khiamniungan"),
  konyak: {
    ...createMorung("konyak", "Konyak"),
    image: "/images/morungs/konyak.webp",
  },
  kuki: createMorung("kuki", "Kuki"),
  kachari: {
    ...createMorung("kachari", "Kachari"),
    image: "/images/morungs/kachari.webp",
  },
  lotha: {
    ...createMorung("lotha", "Lotha"),
    image: "/images/morungs/lotha.webp",
  },
  phom: {
    ...createMorung("phom", "Phom"),
    image: "/images/morungs/phom.webp",
  },
  pochury: {
    ...createMorung("pochury", "Pochury"),
    image: "/images/morungs/pochury.webp",
  },
  rengma: createMorung("rengma", "Rengma"),
  sangtam: {
    ...createMorung("sangtam", "Sangtam"),
    image: "/images/morungs/sangtam.webp",
  },
  sumi: {
    ...createMorung("sumi", "Sumi"),
    image: "/images/morungs/sumi.webp",
  },
  tikhir: createMorung("tikhir", "Tikhir"),
  yimkhiung: {
    ...createMorung("yimkhiung", "Yimkhiung"),
    image: "/images/morungs/yimkhiung.webp",
  },
  zeliang: createMorung("zeliang", "Zeliang"),
  /**
   * Additive 18th Morung. Unique slug `international` — does not alter any
   * existing QR destination. Content and photography to be supplied later.
   */
  international: {
    id: "international",
    name: "International Morung",
    category: "HORNBILL FESTIVAL",
    description: "More information coming soon.",
    image: null,
    availability: "coming-soon",
    verificationStatus: "not-started",
    reviewStatus: "not-started",
    sections: Object.fromEntries(
      morungSectionKeys.map((key) => [key, []])
    ) as NonNullable<Location["sections"]>,
    sectionVerificationStatus: Object.fromEntries(
      morungSectionKeys.map((key) => [key, "not-started"])
    ) as NonNullable<Location["sectionVerificationStatus"]>,
    questions: [
      "What verified information is available about the International Morung?",
      "What can I see at this Morung?",
      "What is happening at Hornbill?",
      "Explore other Morungs",
    ],
    media: [],
    relatedEvents: [],
    navigation: { venue: "Kisama Heritage Village, Nagaland" },
    source: [],
  },
};

/** Ordered Morung list for grids and counts. */
export const morungLocations = Object.values(locations);
