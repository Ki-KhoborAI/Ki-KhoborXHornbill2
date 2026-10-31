/**
 * Generator script: Reads all 7 remaining worksheets from the Excel workbook
 * and produces individual JSON files in data/generated/ following the exact
 * KnowledgeItemSchema and metadata conventions used by the existing importer.
 *
 * Worksheets processed:
 *   Nagaland Basics      -> geography_basics      -> nagaland_basics.json
 *   Morungs              -> morungs_overview       -> morungs.json
 *   Flora & Nature       -> flora_nature           -> flora_nature.json
 *   Adventure & Trekking -> adventure_trekking     -> adventure_trekking.json
 *   Handicrafts & Handlooms -> handicrafts_handlooms -> handicrafts_handlooms.json
 *   Music & Instruments  -> music_instruments      -> music_instruments.json
 *   Hornbill Festival & Kisama -> kisama_heritage  -> hornbill_kisama.json
 */
import path from 'path';
import fs from 'fs';
import { parseHornbillWorkbook } from '../lib/importer/importer.js';
import type { KnowledgeItem } from '../lib/importer/schemas.js';

const WORKBOOK_PATH = path.resolve('data', 'Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx');
const OUTPUT_DIR = path.resolve('data', 'generated');

// Category -> filename mapping
const CATEGORY_FILENAME_MAP: Record<string, string> = {
  geography_basics: 'nagaland_basics.json',
  morungs_overview: 'morungs.json',
  flora_nature: 'flora_nature.json',
  adventure_trekking: 'adventure_trekking.json',
  handicrafts_handlooms: 'handicrafts_handlooms.json',
  music_instruments: 'music_instruments.json',
  kisama_heritage: 'hornbill_kisama.json',
};

// Excluded categories (already uploaded)
const EXCLUDED_CATEGORIES = new Set(['festival_overview']);

async function main() {
  console.log('\n====================================================');
  console.log('  Ki-Khobor X Hornbill 2026 - JSON File Generator  ');
  console.log('====================================================\n');

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Parse the workbook using the EXACT same importer as production
  console.log('Parsing workbook...');
  const parsed = await parseHornbillWorkbook(WORKBOOK_PATH);
  console.log(`Workbook parsed: ${parsed.workbookName}`);
  console.log(`  Total knowledge items parsed: ${parsed.knowledgeItems.length}`);
  console.log(`  Validation errors: ${parsed.validationErrors.length}`);
  if (parsed.validationErrors.length > 0) {
    for (const err of parsed.validationErrors) {
      console.error(`  [VALIDATION ERROR] Sheet: ${err.sheetName}, Row: ${err.rowNumber}: ${err.error}`);
    }
  }
  console.log(`  Skipped sheets: ${parsed.skippedSheets.map(s => s.sheetName).join(', ')}`);
  console.log(`  Skipped rows: ${parsed.skippedRows.length}`);

  // Group by category
  const byCategory: Record<string, KnowledgeItem[]> = {};
  for (const item of parsed.knowledgeItems) {
    if (EXCLUDED_CATEGORIES.has(item.category)) continue; // skip festival_overview
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  console.log('\nGrouped by category:');
  for (const [cat, items] of Object.entries(byCategory)) {
    console.log(`  ${cat}: ${items.length} items`);
  }

  // --- Validation: check slug uniqueness within each category ---
  let slugErrors = 0;
  for (const [cat, items] of Object.entries(byCategory)) {
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.slug)) {
        console.error(`  [DUPLICATE SLUG] Category: ${cat}, Slug: ${item.slug}`);
        slugErrors++;
      }
      seen.add(item.slug);
    }
  }
  if (slugErrors > 0) {
    console.error(`\n${slugErrors} duplicate slug(s) detected. Fix before writing files.`);
    process.exit(1);
  }

  // --- Cross-check: no slug appears in multiple categories ---
  const allSlugs = new Map<string, string>();
  let crossCatErrors = 0;
  for (const [cat, items] of Object.entries(byCategory)) {
    for (const item of items) {
      if (allSlugs.has(item.slug)) {
        console.error(`  [CROSS-CATEGORY DUPLICATE SLUG] '${item.slug}' in both '${allSlugs.get(item.slug)}' and '${cat}'`);
        crossCatErrors++;
      } else {
        allSlugs.set(item.slug, cat);
      }
    }
  }
  if (crossCatErrors > 0) {
    console.error(`\n${crossCatErrors} cross-category slug duplicate(s) detected. Cannot proceed.`);
    process.exit(1);
  }

  // --- Write JSON files ---
  const filesWritten: string[] = [];
  const generationSummary: Array<{ category: string; filename: string; count: number }> = [];

  for (const [cat, items] of Object.entries(byCategory)) {
    const filename = CATEGORY_FILENAME_MAP[cat];
    if (!filename) {
      console.warn(`  [WARN] No filename mapping for category '${cat}'. Skipping.`);
      continue;
    }
    const outPath = path.join(OUTPUT_DIR, filename);

    // Serialize with Date objects converted to ISO strings for JSON portability
    // These will be re-hydrated as Date objects when inserted by the upload script
    const serialized = items.map(item => ({
      ...item,
      createdAt: (item.createdAt as Date).toISOString(),
      updatedAt: (item.updatedAt as Date).toISOString(),
      metadata: {
        ...item.metadata,
        importedAt: (item.metadata.importedAt as Date).toISOString(),
      },
    }));

    fs.writeFileSync(outPath, JSON.stringify(serialized, null, 2), 'utf-8');
    filesWritten.push(outPath);
    generationSummary.push({ category: cat, filename, count: items.length });
    console.log(`  Written: ${filename} (${items.length} documents)`);
  }

  // --- Write generation summary report ---
  const reportPath = path.join(OUTPUT_DIR, 'generation_report.json');
  const report = {
    generatedAt: new Date().toISOString(),
    workbook: parsed.workbookName,
    filesGenerated: generationSummary,
    validationErrors: parsed.validationErrors,
    skippedSheets: parsed.skippedSheets,
    skippedRows: parsed.skippedRows,
    incompleteRowNotices: parsed.incompleteRowNotices,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nGeneration report written: generation_report.json`);

  // Final summary
  console.log('\n====================================================');
  console.log(`  ✅ ${filesWritten.length} JSON files generated`);
  const totalDocs = generationSummary.reduce((sum, s) => sum + s.count, 0);
  console.log(`  Total documents across all files: ${totalDocs}`);
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Generator failed:', err);
  process.exit(1);
});
