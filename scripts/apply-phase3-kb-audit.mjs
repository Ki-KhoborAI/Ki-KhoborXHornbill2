/**
 * Phase 3 — apply local knowledgeBase.json data-quality corrections.
 * Restores tribe fields from the source workbook (fixes [object Object]
 * serialization) and softens unverified 2026 festival date claims.
 * Does not invent cultural facts or official announcements.
 */
import fs from "node:fs";
import path from "node:path";
import { parseHornbillWorkbook } from "../lib/importer/importer.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const KB_PATH = path.join(ROOT, "data", "knowledgeBase.json");
const WORKBOOK = path.join(
  ROOT,
  "data",
  "Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx"
);

function isCorrupt(value) {
  return typeof value === "string" && value.includes("[object Object]");
}

function cleanText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || isCorrupt(text)) return null;
  return text;
}

/** Remove time-relative news boilerplate; keep stable seasonal description. */
function sanitizeGaroFestivalDate(text) {
  if (!text) return null;
  const cut = text.split(/\n\s*\nThis year's 50th Golden Jubilee/i)[0];
  return cut.trim() || null;
}

/** Restore obvious truncation without inventing cultural claims. */
function fixAngamiTraditions(text) {
  if (!text) return null;
  return text
    .replace(
      /is a major on February 25th/i,
      "is a major festival held on February 25th"
    )
    .replace(/\s+people\.\s*$/, ".")
    .trim();
}

function buildTribeSubtitle(attrs) {
  const parts = [];
  if (attrs.regionOrDistricts) parts.push(`Region: ${attrs.regionOrDistricts}`);
  if (attrs.traditionalFestivalName) {
    const fest = attrs.traditionalFestivalName.split(/[:\n]/)[0].trim();
    parts.push(`Festival: ${fest}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function buildTribeContent(attrs) {
  const blocks = [];
  if (attrs.culturalSignificance) blocks.push(attrs.culturalSignificance);
  if (attrs.traditions) blocks.push(attrs.traditions);
  return blocks.length > 0 ? blocks.join("\n\n") : null;
}

const workbook = await parseHornbillWorkbook(WORKBOOK);
const kb = JSON.parse(fs.readFileSync(KB_PATH, "utf8"));
if (!Array.isArray(kb)) {
  throw new Error("knowledgeBase.json must be an array");
}

let tribeUpdates = 0;
for (const tribe of workbook.tribes) {
  const id = `tribe-${tribe.slug}`;
  const record = kb.find((item) => item.id === id);
  if (!record) {
    console.warn("Missing KB tribe record:", id);
    continue;
  }

  let region = cleanText(tribe.regionOrDistricts);
  let festName = cleanText(tribe.traditionalFestivalName);
  let festDate = cleanText(tribe.festivalDateOrSeason);
  let traditions = cleanText(tribe.traditions);
  let significance = cleanText(tribe.culturalSignificance);
  const attire = cleanText(tribe.traditionalAttire); // expected null

  if (tribe.slug === "garo") {
    festDate = sanitizeGaroFestivalDate(festDate);
  }
  if (tribe.slug === "angami") {
    traditions = fixAngamiTraditions(traditions);
  }

  const attrs = {
    ...(record.attributes || {}),
    tribeName: tribe.name,
    regionOrDistricts: region,
    traditionalFestivalName: festName,
    festivalDateOrSeason: festDate,
    traditions,
    traditionalAttire: attire,
    culturalSignificance: significance,
    dataQuality: {
      traditionalAttireStatus: attire ? "present" : "missing_needs_research",
      corruptedFieldsCleared: true,
      syncedFromWorkbook: true,
    },
  };

  if (tribe.slug === "garo") {
    attrs.dataQuality.ephemeralScheduleTextRemoved = true;
    attrs.dataQuality.regionOrDistrictsStatus = region
      ? "present"
      : "missing_needs_research";
  }
  if (tribe.slug === "angami") {
    attrs.dataQuality.traditionsTruncationRepaired = true;
    attrs.dataQuality.culturalSignificanceNote =
      "Field is a short festival blurb; fuller tribe-wide significance still needs handbook review.";
  }

  record.attributes = attrs;
  record.subtitle = buildTribeSubtitle(attrs);
  record.content = buildTribeContent(attrs);
  if (tribe.source) record.source = tribe.source;
  tribeUpdates += 1;
}

// --- Festival date provenance corrections ---
const duration = kb.find((item) => item.id === "duration-and-dates");
if (duration) {
  duration.content =
    "The Hornbill Festival is traditionally held over about 10 days in early December at Kisama Naga Heritage Village, near Kohima.\n\n" +
    "Confirmed calendar dates for Hornbill Festival 2026 have not been verified from an official Government of Nagaland, Tourism Department, or Hornbill Festival handbook source in this knowledge base. " +
    "Do not treat any specific 2026 start or end dates as official facts until confirmed by those channels.\n\n" +
    "Historical reference: the Hornbill Festival 2025 Final Handbook documented the 2025 edition as 1–10 December 2025 (opening and closing ceremonies at Unity Plaza, Kisama). That handbook content is 2025 historical information only and must not be presented as the confirmed 2026 programme.";
  duration.attributes = {
    ...(duration.attributes || {}),
    verificationStatus: "unverified",
    editionYear: null,
    claimCertainty: "unconfirmed",
    requiresOfficialConfirmation: true,
    historicalReferenceId:
      "kisama-heritage-2025-edition-details-hornbill-festival-2025-dates",
    provenanceNote:
      "Prior wording asserted 1–10 December 2026 from 'Open Source Internet' without adequate official evidence.",
  };
  // Keep source label honest — still not an official citation.
  duration.source = "Open Source Internet (unverified; requires official confirmation)";
}

const dates2025 = kb.find(
  (item) =>
    item.id ===
    "kisama-heritage-2025-edition-details-hornbill-festival-2025-dates"
);
if (dates2025) {
  dates2025.attributes = {
    ...(dates2025.attributes || {}),
    verificationStatus: "historical",
    editionYear: 2025,
    claimCertainty: "handbook_documented",
    appliesToEdition: 2025,
    notApplicableAsConfirmed2026: true,
  };
}

const climate = kb.find(
  (item) => item.id === "geography-basics-climate-best-time-to-visit"
);
if (climate && typeof climate.content === "string") {
  climate.content = climate.content.replace(
    "December: The world-famous Hornbill Festival takes place from December 1 to 10 at the Naga Heritage Village in Kisama.",
    "December: The Hornbill Festival is traditionally associated with early December at the Naga Heritage Village in Kisama (historically often spanning about 10 days). Confirm the current year's official dates before travel planning."
  );
  climate.attributes = {
    ...(climate.attributes || {}),
    verificationStatus: "unverified",
    claimCertainty: "typical_window_unconfirmed_for_2026",
    requiresOfficialConfirmation: true,
  };
}

// Mark adventure records that explicitly mention 2025 Hornbill as historical.
for (const item of kb) {
  if (item.category !== "adventure_trekking") continue;
  const season = item.attributes?.bestSeason;
  if (typeof season === "string" && /2025/.test(season)) {
    item.attributes = {
      ...item.attributes,
      verificationStatus: "historical",
      editionYear: 2025,
      notApplicableAsConfirmed2026: true,
    };
  }
}

fs.writeFileSync(KB_PATH, JSON.stringify(kb, null, 2) + "\n", "utf8");
console.log(
  JSON.stringify(
    {
      tribeUpdates,
      durationFixed: Boolean(duration),
      dates2025Annotated: Boolean(dates2025),
      climateSoftened: Boolean(climate),
    },
    null,
    2
  )
);
