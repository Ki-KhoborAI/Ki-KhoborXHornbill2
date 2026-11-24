/**
 * Read-only Atlas vs local discrepancy detail for Phase 4.
 * Prints field-level flags only — no secrets, no full document dumps.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import knowledgeBase from "../data/knowledgeBase.json" with { type: "json" };
import { closeDatabase, getDatabase } from "../lib/db.ts";

function has(text, re) {
  return re.test(String(text || ""));
}

try {
  const db = await getDatabase();
  const knowledge = db.collection("knowledge_items");
  const tribes = db.collection("tribes");

  const duration = await knowledge.findOne({ slug: "duration-and-dates" });
  const localDuration = knowledgeBase.find((r) => r.id === "duration-and-dates");
  console.log(
    JSON.stringify(
      {
        duration: {
          atlasChars: String(duration?.content || "").length,
          localChars: String(localDuration?.content || "").length,
          atlasConfirmed2026: has(
            duration?.content,
            /Hornbill Festival 2026 runs for 10 days, from 1st to 10th December 2026/i
          ),
          localConfirmed2026: has(
            localDuration?.content,
            /Hornbill Festival 2026 runs for 10 days, from 1st to 10th December 2026/i
          ),
          localSaysUnverified: has(
            localDuration?.content,
            /have not been verified/i
          ),
          atlasSource: duration?.source ? "present" : "null",
          atlasStatus: duration?.status || null,
        },
      },
      null,
      2
    )
  );

  const climate = await knowledge.findOne({
    slug: "geography-basics-climate-best-time-to-visit",
  });
  const localClimate = knowledgeBase.find(
    (r) => r.id === "geography-basics-climate-best-time-to-visit"
  );
  console.log(
    JSON.stringify(
      {
        climate: {
          atlasHasHardDec1to10: has(
            climate?.content,
            /takes place from December 1 to 10/i
          ),
          localHasHardDec1to10: has(
            localClimate?.content,
            /takes place from December 1 to 10/i
          ),
          localSoftened: has(
            localClimate?.content,
            /traditionally associated with early December/i
          ),
        },
      },
      null,
      2
    )
  );

  const tribeDiffs = [];
  for (const local of knowledgeBase.filter((r) => r.category === "tribe_profile")) {
    const slug = local.id.replace(/^tribe-/, "");
    const atlas = await tribes.findOne({ slug });
    if (!atlas) {
      tribeDiffs.push({ slug, issue: "missing_in_atlas" });
      continue;
    }
    const fields = [
      "regionOrDistricts",
      "traditionalFestivalName",
      "festivalDateOrSeason",
      "traditions",
      "culturalSignificance",
      "traditionalAttire",
    ];
    const mismatches = [];
    for (const f of fields) {
      const a = atlas[f] == null ? null : String(atlas[f]).trim();
      const l =
        local.attributes?.[f] == null
          ? null
          : String(local.attributes[f]).trim();
      if (a !== l) mismatches.push(f);
    }
    tribeDiffs.push({
      slug,
      mismatchCount: mismatches.length,
      mismatches,
      atlasObjectObject: JSON.stringify(atlas).includes("[object Object]"),
      atlasAttireNull: atlas.traditionalAttire == null,
      atlasStatus: atlas.status || null,
      atlasHasGaroJubilee:
        slug === "garo" &&
        has(atlas.festivalDateOrSeason, /Golden Jubilee|just under a month/i),
      localHasGaroJubilee:
        slug === "garo" &&
        has(
          local.attributes?.festivalDateOrSeason,
          /Golden Jubilee|just under a month/i
        ),
      atlasAngamiTruncation:
        slug === "angami" && has(atlas.traditions, /is a major on February/i),
      localAngamiRepaired:
        slug === "angami" &&
        has(local.attributes?.traditions, /is a major festival held on February/i),
    });
  }

  const mismatching = tribeDiffs.filter((t) => (t.mismatchCount || 0) > 0);
  console.log(
    JSON.stringify(
      {
        tribeSummary: {
          compared: tribeDiffs.length,
          withFieldMismatches: mismatching.length,
          objectObjectAnywhere: tribeDiffs.some((t) => t.atlasObjectObject),
          attireNullAll:
            tribeDiffs.filter((t) => t.atlasAttireNull).length ===
            tribeDiffs.length,
        },
        mismatching,
      },
      null,
      2
    )
  );

  // Status distribution if present
  const statuses = await knowledge
    .aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }])
    .toArray();
  const tribeStatuses = await tribes
    .aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }])
    .toArray();
  console.log(
    JSON.stringify({ knowledgeStatuses: statuses, tribeStatuses }, null, 2)
  );
} finally {
  await closeDatabase();
}
