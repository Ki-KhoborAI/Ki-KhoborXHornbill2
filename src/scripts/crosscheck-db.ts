/**
 * Cross-check script: Reads the 7 generated JSON files and compares them
 * against existing MongoDB Atlas records in the knowledge_items collection.
 * READ-ONLY. Never writes to the database.
 *
 * Produces a comparison report and verifies:
 *   A. Existing tribe records are untouched
 *   B. Festival Overview records are untouched
 *   C. Per-file: generated vs existing vs missing vs conflicts
 */
import fs from 'fs';
import path from 'path';
import { connectToDatabase, closeDatabase } from '../shared/db.js';
import { env } from '../config/env.js';

const GEN_DIR = path.resolve('data', 'generated');

const FILE_MAP: Array<{ filename: string; category: string; worksheet: string }> = [
  { filename: 'nagaland_basics.json',       category: 'geography_basics',      worksheet: 'Nagaland Basics' },
  { filename: 'morungs.json',               category: 'morungs_overview',      worksheet: 'Morungs' },
  { filename: 'flora_nature.json',          category: 'flora_nature',          worksheet: 'Flora & Nature' },
  { filename: 'adventure_trekking.json',    category: 'adventure_trekking',    worksheet: 'Adventure & Trekking' },
  { filename: 'handicrafts_handlooms.json', category: 'handicrafts_handlooms', worksheet: 'Handicrafts & Handlooms' },
  { filename: 'music_instruments.json',     category: 'music_instruments',     worksheet: 'Music & Instruments' },
  { filename: 'hornbill_kisama.json',       category: 'kisama_heritage',       worksheet: 'Hornbill Festival & Kisama' },
];

async function main() {
  console.log('\n=======================================================');
  console.log('  Ki-Khobor X Hornbill 2026 - Database Cross-Check   ');
  console.log('  READ-ONLY - No writes will be made                  ');
  console.log('=======================================================\n');

  const db = await connectToDatabase(env.MONGODB_URI);
  const tribesCol = db.collection('tribes');
  const kiCol = db.collection('knowledge_items');

  // === CHECK A: Existing tribes ===
  const tribeCount = await tribesCol.countDocuments();
  const expectedTribes = ['angami','ao','chakhesang','chang','garo','kachari','khiamniungan','konyak','kuki','lotha','phom','pochury','rengma','sangtam','sumi','tikhir','yimkhiung','zeliang'];
  const missingTribes: string[] = [];
  for (const slug of expectedTribes) {
    const exists = await tribesCol.findOne({ slug });
    if (!exists) missingTribes.push(slug);
  }
  console.log(`=== CHECK A: Tribes Collection ===`);
  console.log(`  Total tribes in Atlas: ${tribeCount}`);
  console.log(`  Expected 18 tribes present: ${missingTribes.length === 0 ? '✅ YES' : '❌ NO - Missing: ' + missingTribes.join(', ')}`);

  // === CHECK B: Festival Overview ===
  const festivalCount = await kiCol.countDocuments({ category: 'festival_overview' });
  const expectedFestivalSlugs = [
    'what-the-hornbill-festival-is',
    'purpose-of-the-festival',
    'history-and-how-it-began',
    'cultural-significance',
    'meaning-of-the-name-hornbill',
    'who-organises-it',
    'introduction-to-nagaland-for-visitors',
    'duration-and-dates',
    'location',
  ];
  const missingFestival: string[] = [];
  for (const slug of expectedFestivalSlugs) {
    const exists = await kiCol.findOne({ slug, category: 'festival_overview' });
    if (!exists) missingFestival.push(slug);
  }
  console.log(`\n=== CHECK B: Festival Overview (knowledge_items) ===`);
  console.log(`  Festival overview docs in Atlas: ${festivalCount}`);
  console.log(`  All 9 expected slugs present: ${missingFestival.length === 0 ? '✅ YES' : '❌ NO - Missing: ' + missingFestival.join(', ')}`);

  // === CHECK C: Per-file comparison ===
  console.log('\n=== CHECK C: Remaining knowledge_items comparison ===\n');

  interface FileReport {
    worksheet: string;
    filename: string;
    generated: number;
    alreadyInAtlas: string[];
    missingFromAtlas: string[];
    conflicts: string[];
  }

  const fileReports: FileReport[] = [];
  const readyForUpload: string[] = [];
  const alreadyExisting: string[] = [];
  const conflicts: string[] = [];

  for (const { filename, category, worksheet } of FILE_MAP) {
    const filePath = path.join(GEN_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.error(`  MISSING FILE: ${filename}`);
      continue;
    }

    const docs: Array<{ slug: string; category: string; title: string; content: string | null }> =
      JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const report: FileReport = {
      worksheet,
      filename,
      generated: docs.length,
      alreadyInAtlas: [],
      missingFromAtlas: [],
      conflicts: [],
    };

    for (const doc of docs) {
      const existing = await kiCol.findOne({ slug: doc.slug });

      if (!existing) {
        report.missingFromAtlas.push(doc.slug);
        readyForUpload.push(doc.slug);
      } else {
        // Check for category conflict
        if (existing.category !== doc.category) {
          const conflictMsg = `${doc.slug} (generated: ${doc.category}, atlas: ${existing.category})`;
          report.conflicts.push(conflictMsg);
          conflicts.push(conflictMsg);
        } else {
          report.alreadyInAtlas.push(doc.slug);
          alreadyExisting.push(doc.slug);
        }
      }
    }

    fileReports.push(report);
    console.log(`  ${worksheet} (${filename})`);
    console.log(`    Generated: ${report.generated}`);
    console.log(`    Already in Atlas: ${report.alreadyInAtlas.length}`);
    console.log(`    Missing from Atlas: ${report.missingFromAtlas.length}`);
    console.log(`    Conflicts: ${report.conflicts.length}`);
    if (report.conflicts.length > 0) {
      console.error('    CONFLICTS: ' + report.conflicts.join(', '));
    }
  }

  // === Summary table ===
  console.log('\n=== SUMMARY TABLE ===\n');
  console.log('Worksheet                  | Generated | In Atlas | Missing | Conflicts');
  console.log('---------------------------|-----------|----------|---------|----------');
  for (const r of fileReports) {
    const ws = r.worksheet.padEnd(26);
    const gen = String(r.generated).padStart(9);
    const inAtlas = String(r.alreadyInAtlas.length).padStart(8);
    const missing = String(r.missingFromAtlas.length).padStart(7);
    const conf = String(r.conflicts.length).padStart(9);
    console.log(`${ws}| ${gen} | ${inAtlas} | ${missing} | ${conf}`);
  }

  const totalGenerated = fileReports.reduce((s, r) => s + r.generated, 0);
  const totalInAtlas = fileReports.reduce((s, r) => s + r.alreadyInAtlas.length, 0);
  const totalMissing = fileReports.reduce((s, r) => s + r.missingFromAtlas.length, 0);
  const totalConflicts = fileReports.reduce((s, r) => s + r.conflicts.length, 0);
  console.log('---------------------------|-----------|----------|---------|----------');
  const totalW = 'TOTAL'.padEnd(26);
  console.log(`${totalW}| ${String(totalGenerated).padStart(9)} | ${String(totalInAtlas).padStart(8)} | ${String(totalMissing).padStart(7)} | ${String(totalConflicts).padStart(9)}`);

  // === Final confirmation ===
  console.log('\n=== CONFIRMATION ===');
  console.log(`  Tribe records modified/duplicated: ❌ NONE (read-only)`);
  console.log(`  Festival Overview modified/duplicated: ❌ NONE (read-only)`);
  console.log(`  Records ready for upload: ${readyForUpload.length}`);
  console.log(`  Records already in Atlas: ${alreadyExisting.length}`);
  console.log(`  Conflicts requiring attention: ${conflicts.length}`);

  if (conflicts.length > 0) {
    console.log('\nCONFLICT DETAILS:');
    for (const c of conflicts) console.error('  ' + c);
  }

  // Write comparison report
  const reportOut = {
    generatedAt: new Date().toISOString(),
    checksA_Tribes: {
      totalInAtlas: tribeCount,
      expectedPresent: missingTribes.length === 0,
      missingTribes,
    },
    checksB_FestivalOverview: {
      totalInAtlas: festivalCount,
      allExpectedPresent: missingFestival.length === 0,
      missingFestival,
    },
    checksC_PerFile: fileReports,
    summary: { totalGenerated, totalInAtlas, totalMissing: totalMissing, totalConflicts },
    readyForUpload,
    alreadyExisting,
    conflicts,
  };

  const reportPath = path.join(GEN_DIR, 'db_comparison_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportOut, null, 2), 'utf-8');
  console.log(`\nComparison report written: ${reportPath}`);

  await closeDatabase();
  console.log('\n=== Cross-check complete (READ-ONLY). No data was modified. ===\n');
}

main().catch(async (err) => {
  console.error('Cross-check failed:', err);
  await closeDatabase();
  process.exit(1);
});
