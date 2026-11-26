/**
 * Shared tribe data — single authoritative source for tribe slugs, names,
 * and festival-to-tribe mappings used across the orchestration layer.
 *
 * knowledgeSearch.ts (client-side fallback) maintains its own copy so the
 * offline bundle remains self-contained.
 *
 * Official recognition (Govt. of Nagaland / IPR Basic Facts framing):
 * - 15 Official Naga Tribes
 * - 4 Recognised Non-Naga Indigenous Tribes (Garo, Kachari, Kuki, Mikir)
 * Hornbill cultural programmes commonly feature 18 troupes
 * (15 Naga + Garo, Kachari, Kuki).
 */

/** Official Naga tribes (15). */
export const NAGA_TRIBE_SLUGS: readonly string[] = [
  "angami",
  "ao",
  "chakhesang",
  "chang",
  "khiamniungan",
  "konyak",
  "lotha",
  "phom",
  "pochury",
  "rengma",
  "sangtam",
  "sumi",
  "tikhir",
  "yimkhiung",
  "zeliang",
];

/** Recognised Non-Naga indigenous tribes (4). */
export const NON_NAGA_INDIGENOUS_TRIBE_SLUGS: readonly string[] = [
  "garo",
  "kachari",
  "kuki",
  "mikir",
];

export const OFFICIAL_NAGA_TRIBE_COUNT = NAGA_TRIBE_SLUGS.length;
export const OFFICIAL_NON_NAGA_INDIGENOUS_TRIBE_COUNT =
  NON_NAGA_INDIGENOUS_TRIBE_SLUGS.length;

/**
 * Catalogue slugs used for detection / Hornbill-facing profiles.
 * Includes the 15 Naga tribes plus Garo, Kachari, Kuki (18 troupes).
 * Mikir is recognised officially but is not part of the usual 18-troupe set.
 */
export const TRIBE_SLUGS: readonly string[] = [
  "angami", "ao", "chakhesang", "chang", "garo", "kachari",
  "khiamniungan", "konyak", "kuki", "lotha", "phom", "pochury",
  "rengma", "sangtam", "sumi", "tikhir", "yimkhiung", "zeliang",
];

/** Human-readable tribe names indexed by slug. */
export const TRIBE_NAMES: Readonly<Record<string, string>> = {
  angami: "Angami", ao: "Ao", chakhesang: "Chakhesang", chang: "Chang",
  garo: "Garo", kachari: "Kachari", khiamniungan: "Khiamniungan",
  konyak: "Konyak", kuki: "Kuki", lotha: "Lotha", mikir: "Mikir",
  phom: "Phom", pochury: "Pochury", rengma: "Rengma", sangtam: "Sangtam",
  sumi: "Sumi", tikhir: "Tikhir", yimkhiung: "Yimkhiung", zeliang: "Zeliang",
};

export type TribeClassification =
  | "official_naga"
  | "recognised_non_naga_indigenous"
  | "other";

export function classifyTribeSlug(slug: string | null | undefined): TribeClassification {
  const key = (slug || "").trim().toLowerCase();
  if (!key) return "other";
  if (NAGA_TRIBE_SLUGS.includes(key)) return "official_naga";
  if (NON_NAGA_INDIGENOUS_TRIBE_SLUGS.includes(key)) {
    return "recognised_non_naga_indigenous";
  }
  return "other";
}

export function tribeClassificationLabel(kind: TribeClassification): string {
  switch (kind) {
    case "official_naga":
      return "Official Naga";
    case "recognised_non_naga_indigenous":
      return "Recognised Non-Naga indigenous";
    default:
      return "Other";
  }
}

/** Maps traditional festival names (lowercase) to their tribe slug. */
export const FESTIVAL_TO_TRIBE: Readonly<Record<string, string>> = {
  sekrenyi: "angami", phousanyi: "angami",
  moatsu: "ao", tsungremmong: "ao",
  tsukhenyie: "chakhesang", sukhrunye: "chakhesang",
  naknyulum: "chang", kundaglum: "chang",
  wangala: "garo",
  "busu dima": "kachari",
  miu: "khiamniungan", tsokum: "khiamniungan",
  aoleang: "konyak", "lao-ong mo": "konyak", "lao ong mo": "konyak",
  lingnyu: "konyak", "bong-ong": "konyak",
  mimkut: "kuki", "chavang kut": "kuki",
  "tokhu emong": "lotha", tokhu: "lotha",
  monyu: "phom",
  yemshe: "pochury",
  ngada: "rengma",
  mongmong: "sangtam",
  tuluni: "sumi", ahuna: "sumi",
  tsungkamneo: "tikhir",
  metumneo: "yimkhiung",
  hega: "zeliang", langsimyi: "zeliang", "chaga gadi": "zeliang",
};

/**
 * Returns the tribe slug found in the given text, or null.
 * Checks tribe slugs first (word-boundary match), then festival names.
 */
export function detectTribeSlug(text: string): string | null {
  const lower = text.toLowerCase();
  const detectionSlugs = [
    ...TRIBE_SLUGS,
    ...NON_NAGA_INDIGENOUS_TRIBE_SLUGS.filter((slug) => !TRIBE_SLUGS.includes(slug)),
  ];
  for (const slug of detectionSlugs) {
    if (new RegExp(`\\b${slug}\\b`, "i").test(lower)) return slug;
  }
  // Common alternate name for Mikir
  if (/\bkarbi\b/i.test(lower)) return "mikir";
  for (const [fest, slug] of Object.entries(FESTIVAL_TO_TRIBE)) {
    if (lower.includes(fest)) return slug;
  }
  return null;
}
