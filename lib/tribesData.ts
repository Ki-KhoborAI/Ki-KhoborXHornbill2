/**
 * Shared tribe data — single authoritative source for tribe slugs, names,
 * and festival-to-tribe mappings used across the orchestration layer.
 *
 * knowledgeSearch.ts (client-side fallback) maintains its own copy so the
 * offline bundle remains self-contained.
 */

/** Canonical slugs for Nagaland's 18 recognised tribes. */
export const TRIBE_SLUGS: readonly string[] = [
  "angami", "ao", "chakhesang", "chang", "garo", "kachari",
  "khiamniungan", "konyak", "kuki", "lotha", "phom", "pochury",
  "rengma", "sangtam", "sumi", "tikhir", "yimkhiung", "zeliang",
];

/** Human-readable tribe names indexed by slug. */
export const TRIBE_NAMES: Readonly<Record<string, string>> = {
  angami: "Angami", ao: "Ao", chakhesang: "Chakhesang", chang: "Chang",
  garo: "Garo", kachari: "Kachari", khiamniungan: "Khiamniungan",
  konyak: "Konyak", kuki: "Kuki", lotha: "Lotha", phom: "Phom",
  pochury: "Pochury", rengma: "Rengma", sangtam: "Sangtam",
  sumi: "Sumi", tikhir: "Tikhir", yimkhiung: "Yimkhiung", zeliang: "Zeliang",
};

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
  for (const slug of TRIBE_SLUGS) {
    if (new RegExp(`\\b${slug}\\b`, "i").test(lower)) return slug;
  }
  for (const [fest, slug] of Object.entries(FESTIVAL_TO_TRIBE)) {
    if (lower.includes(fest)) return slug;
  }
  return null;
}
