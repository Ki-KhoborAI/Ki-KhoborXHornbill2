/**
 * Upload script: Reads all 7 generated JSON files from data/generated/
 * and upserts them into the MongoDB knowledge_items collection.
 *
 * Uses idempotent slug-based upserts — safe to run multiple times.
 * Dates are re-hydrated from ISO strings into native BSON Date objects.
 * Ensures unique indexes on slug, category, and status.
 */
import fs from 'fs';
import path from 'path';
import { connectToDatabase, closeDatabase } from '../lib/db.js';

const GEN_DIR = path.resolve('data', 'generated');

const FILES = [
  { filename: 'nagaland_basics.json',       label: 'Nagaland Basics       (geography_basics)' },
  { filename: 'morungs.json',               label: 'Morungs               (morungs_overview)' },
  { filename: 'flora_nature.json',          label: 'Flora & Nature         (flora_nature)' },
  { filename: 'adventure_trekking.json',    label: 'Adventure & Trekking   (adventure_trekking)' },
  { filename: 'handicrafts_handlooms.json', label: 'Handicrafts & Handlooms(handicrafts_handlooms)' },
  { filename: 'music_instruments.json',     label: 'Music & Instruments    (music_instruments)' },
  { filename: 'hornbill_kisama.json',       label: 'Hornbill & Kisama      (kisama_heritage)' },
];

/** Provenance metadata as stored in generated JSON (ISO date strings). */
type KnowledgeItemJsonMetadata = {
  sourceWorkbook: string;
  sourceWorksheet: string;
  sourceRow: number;
  importedAt: string;
  rawSourceStatus?: string | null;
  sourceCitation?: string | null;
  notes?: string | null;
  originalHeaders?: Record<string, unknown>;
};

/** Knowledge item document shape in data/generated/*.json before Date rehydration. */
type KnowledgeItemJson = {
  slug: string;
  category: string;
  title: string;
  subtitle?: string | null;
  content: string | null;
  attributes: Record<string, unknown>;
  source: string | null;
  status: string;
  metadata: KnowledgeItemJsonMetadata;
  createdAt: string;
  updatedAt: string;
};

/** Same document after ISO strings are converted to Date for MongoDB upsert. */
type KnowledgeItemDocument = Omit<KnowledgeItemJson, 'createdAt' | 'updatedAt' | 'metadata'> & {
  createdAt: Date;
  updatedAt: Date;
  metadata: Omit<KnowledgeItemJsonMetadata, 'importedAt'> & { importedAt: Date };
};

function isKnowledgeItemJson(value: unknown): value is KnowledgeItemJson {
  if (typeof value !== 'object' || value === null) return false;
  if (!('slug' in value) || typeof value.slug !== 'string') return false;
  if (!('createdAt' in value) || typeof value.createdAt !== 'string') return false;
  if (!('updatedAt' in value) || typeof value.updatedAt !== 'string') return false;
  if (!('metadata' in value) || typeof value.metadata !== 'object' || value.metadata === null) {
    return false;
  }
  return (
    'importedAt' in value.metadata && typeof value.metadata.importedAt === 'string'
  );
}

/** Re-hydrate ISO date strings into native Date objects */
function rehydrateDates(doc: KnowledgeItemJson): KnowledgeItemDocument {
  return {
    ...doc,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
    metadata: {
      ...doc.metadata,
      importedAt: new Date(doc.metadata.importedAt),
    },
  };
}

async function main() {
  console.log('\n====================================================');
  console.log('  Ki-Khobor X Hornbill 2026 — Knowledge Items Upload');
  console.log('====================================================\n');

  const db = await connectToDatabase(process.env.MONGODB_URI);
  const col = db.collection('knowledge_items');

  // Ensure indexes (idempotent)
  await col.createIndex({ slug: 1 }, { unique: true });
  await col.createIndex({ category: 1 });
  await col.createIndex({ status: 1 });
  console.log('Indexes ensured.\n');

  let grandInserted = 0;
  let grandUpdated  = 0;
  let grandSkipped  = 0;
  let grandErrors   = 0;

  for (const { filename, label } of FILES) {
    const filePath = path.join(GEN_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filename}`);
      grandErrors++;
      continue;
    }

    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!Array.isArray(parsed) || !parsed.every(isKnowledgeItemJson)) {
      console.error(`❌ Invalid knowledge item JSON shape: ${filename}`);
      grandErrors++;
      continue;
    }
    const raw: KnowledgeItemJson[] = parsed;
    const docs = raw.map(rehydrateDates);

    let inserted = 0, updated = 0, skipped = 0, errors = 0;

    for (const doc of docs) {
      try {
        // Destructure createdAt out so $set and $setOnInsert don't conflict
        const { createdAt, ...docWithoutCreatedAt } = doc;
        const result = await col.updateOne(
          { slug: doc.slug },
          {
            $set: { ...docWithoutCreatedAt, updatedAt: new Date() },
            $setOnInsert: { createdAt: createdAt ?? new Date() },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) inserted++;
        else if (result.modifiedCount > 0) updated++;
        else skipped++; // matched but no change
      } catch (err) {
        console.error(`  ❌ Error upserting '${doc.slug}': ${err instanceof Error ? err.message : err}`);
        errors++;
      }
    }

    const status = errors === 0 ? '✅' : '⚠️';
    console.log(`${status} ${label}`);
    console.log(`   Total: ${docs.length} | Inserted: ${inserted} | Updated: ${updated} | Unchanged: ${skipped} | Errors: ${errors}`);

    grandInserted += inserted;
    grandUpdated  += updated;
    grandSkipped  += skipped;
    grandErrors   += errors;
  }

  // Final count
  const totalInCollection = await col.countDocuments();
  const byCategory = await col.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).toArray();

  console.log('\n====================================================');
  console.log('  Upload Summary');
  console.log('====================================================');
  console.log(`  Inserted  : ${grandInserted}`);
  console.log(`  Updated   : ${grandUpdated}`);
  console.log(`  Unchanged : ${grandSkipped}`);
  console.log(`  Errors    : ${grandErrors}`);
  console.log(`\n  Total docs in knowledge_items: ${totalInCollection}`);
  console.log('\n  By category:');
  for (const row of byCategory) {
    console.log(`    ${String(row._id).padEnd(30)} : ${row.count}`);
  }
  console.log('====================================================\n');

  await closeDatabase();
}

main().catch(async (err) => {
  console.error('Upload failed:', err);
  await closeDatabase();
  process.exit(1);
});
