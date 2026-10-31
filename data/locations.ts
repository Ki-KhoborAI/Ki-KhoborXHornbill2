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
 * unconfirmed. The source-backed count of 17 is kept as a target only.
 */
export const targetMorungCount = 17;

export const locations: Record<string, Location> = {
  angami: createMorung("angami", "Angami"),
  ao: createMorung("ao", "Ao"),
  chakhesang: createMorung("chakhesang", "Chakhesang"),
  chang: createMorung("chang", "Chang"),
  khiamniungan: createMorung("khiamniungan", "Khiamniungan"),
  konyak: createMorung("konyak", "Konyak"),
  kuki: createMorung("kuki", "Kuki"),
  kachari: createMorung("kachari", "Kachari"),
  lotha: createMorung("lotha", "Lotha"),
  phom: createMorung("phom", "Phom"),
  pochury: createMorung("pochury", "Pochury"),
  rengma: createMorung("rengma", "Rengma"),
  sangtam: createMorung("sangtam", "Sangtam"),
  sumi: createMorung("sumi", "Sumi"),
  tikhir: createMorung("tikhir", "Tikhir"),
  yimkhiung: createMorung("yimkhiung", "Yimkhiung"),
  zeliang: createMorung("zeliang", "Zeliang"),
};
