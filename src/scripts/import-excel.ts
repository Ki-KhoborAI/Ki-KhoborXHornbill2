import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';
import { connectToDatabase, closeDatabase } from '../shared/db.js';
import { parseHornbillWorkbook, executeImport } from '../modules/content/importer.js';
import type { Db } from 'mongodb';

/**
 * Main CLI runner for the Hornbill 2026 Excel Data Importer.
 * Defaults to DRY-RUN mode.
 * Real database writes require passing the explicit `--write` flag.
 */
async function runImporter() {
  const args = process.argv.slice(2);
  const isWriteMode = args.includes('--write') || args.includes('--commit');
  const isDryRun = !isWriteMode;

  // Resolve workbook path
  const defaultWorkbookPath = path.resolve(
    process.cwd(),
    'data',
    'Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx'
  );

  const customFileArgIndex = args.indexOf('--file');
  const workbookPath =
    customFileArgIndex !== -1 && args[customFileArgIndex + 1]
      ? path.resolve(process.cwd(), args[customFileArgIndex + 1])
      : defaultWorkbookPath;

  console.log('\n================================================================');
  console.log('       Ki-Khobor X Hornbill 2026 - Excel Data Importer          ');
  console.log('================================================================');
  console.log(` Mode         : ${isDryRun ? '🔍 DRY-RUN (Safe default - NO writes)' : '⚡ WRITE MODE (Idempotent Upsert)'}`);
  console.log(` Target File  : ${path.basename(workbookPath)}`);
  console.log(` Status Policy: All imported records set to status: "draft"`);
  console.log('================================================================\n');

  if (!fs.existsSync(workbookPath)) {
    console.error(`❌ Workbook file not found at: ${workbookPath}`);
    process.exit(1);
  }

  let db: Db | null = null;
  try {
    // Attempt DB connection to cross-reference existing records and check insert/update state
    console.log('Connecting to MongoDB Atlas to check existing records...');
    db = await connectToDatabase(env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas successfully.\n');
  } catch (dbErr) {
    if (!isDryRun) {
      console.error('❌ Cannot run in WRITE mode without an active MongoDB connection.');
      console.error(dbErr instanceof Error ? dbErr.message : dbErr);
      process.exit(1);
    }
    const sanitizedErrMsg = (dbErr instanceof Error ? dbErr.message : String(dbErr))
      .replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
    console.warn(`⚠️  MongoDB connection note: ${sanitizedErrMsg}`);
    console.warn('   Dry-run will continue in offline mode (all records treated as pending insert).\n');
  }

  try {
    console.log('Parsing and validating workbook sheets...');
    const parsed = await parseHornbillWorkbook(workbookPath);

    console.log('Evaluating records against database...');
    const report = await executeImport(parsed, db, {
      dryRun: isDryRun,
      filePath: workbookPath,
    });

    // Output formatted results
    console.log('\n----------------------------------------------------------------');
    console.log('                      IMPORT SUMMARY REPORT                     ');
    console.log('----------------------------------------------------------------');
    console.log(`Total Valid Records Parsed: ${report.totalParsedRows}`);
    console.log(`  • Tribes Collection     : ${report.tribesStats.total} records`);
    console.log(`  • Knowledge Items       : ${report.knowledgeItemsStats.total} records`);
    console.log('\nKnowledge Items by Category:');
    for (const [category, count] of Object.entries(report.knowledgeItemsStats.byCategory)) {
      console.log(`  - ${category.padEnd(25)}: ${count}`);
    }

    console.log('\nDatabase Action Breakdown:');
    if (isDryRun) {
      console.log(`  [Tribes]          To Insert: ${report.tribesStats.toInsert} | To Update: ${report.tribesStats.toUpdate} | (0 writes)`);
      console.log(`  [Knowledge Items] To Insert: ${report.knowledgeItemsStats.toInsert} | To Update: ${report.knowledgeItemsStats.toUpdate} | (0 writes)`);
    } else {
      console.log(`  [Tribes]          Inserted: ${report.tribesStats.inserted} | Updated: ${report.tribesStats.updated}`);
      console.log(`  [Knowledge Items] Inserted: ${report.knowledgeItemsStats.inserted} | Updated: ${report.knowledgeItemsStats.updated}`);
    }

    console.log('\nExcluded / Skipped Sheets:');
    for (const s of report.skippedSheets) {
      console.log(`  • [${s.sheetName}]: ${s.reason}`);
    }

    if (report.validationErrors.length > 0) {
      console.log(`\n❌ Validation Errors (${report.validationErrors.length}):`);
      for (const err of report.validationErrors) {
        console.log(`  • [${err.sheetName} Row ${err.rowNumber}]: ${err.error}`);
      }
    } else {
      console.log('\n Validation: All records passed schema validation without errors.');
    }

    if (report.incompleteRowNotices.length > 0) {
      console.log(`\n⚠️  Incomplete Data Notices (Preserved as-is without fabrication - ${report.incompleteRowNotices.length}):`);
      const sampleNotices = report.incompleteRowNotices.slice(0, 8);
      for (const notice of sampleNotices) {
        console.log(`  • [${notice.sheetName} R${notice.rowNumber}] ${notice.item}: ${notice.notice}`);
      }
      if (report.incompleteRowNotices.length > 8) {
        console.log(`  ... and ${report.incompleteRowNotices.length - 8} additional incomplete data notices.`);
      }
    }

    console.log('\n================================================================');
    if (isDryRun) {
      console.log('✅ DRY-RUN COMPLETED SUCCESSFULLY.');
      console.log('   No records were inserted, modified, or deleted in MongoDB.');
      console.log('   To execute database writes, run: npm run import:data -- --write');
    } else {
      console.log('✅ WRITE COMPLETED SUCCESSFULLY.');
      console.log('   All imported records are saved with status: "draft".');
    }
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ Error executing import process:', err);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

// Execute CLI runner
runImporter();
