import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import type { CellRichTextValue } from 'exceljs';
import { parseHornbillWorkbook, executeImport, extractCellValue } from '../lib/importer/importer.js';
import { TribeSchema, KnowledgeItemSchema, slugify } from '../lib/importer/schemas.js';

/** Minimal synthetic workbook committed under test/fixtures (not the production xlsx). */
const FIXTURE_WORKBOOK_PATH = path.resolve(
  process.cwd(),
  'test',
  'fixtures',
  'importer-sample.xlsx'
);

/** Counts encoded in the synthetic fixture (see scripts/generate-importer-test-fixture.mjs). */
const FIXTURE_TRIBE_COUNT = 2;
const FIXTURE_MORUNG_COUNT = 2;
const FIXTURE_KNOWLEDGE_ITEM_COUNT = 9; // 2 morungs + 7 content-sheet rows
const FIXTURE_TOTAL_PARSED_ROWS = FIXTURE_TRIBE_COUNT + FIXTURE_KNOWLEDGE_ITEM_COUNT;

describe('Data Layer - Schemas & Slugification', () => {
  it('generates deterministic URL-friendly slugs', () => {
    assert.equal(slugify('The 18 Tribes: Angami (Kohima)'), 'the-18-tribes-angami-kohima');
    assert.equal(slugify('Hornbill Festival & Kisama'), 'hornbill-festival-kisama');
    assert.equal(slugify('  Dzukou Valley   Trek  '), 'dzukou-valley-trek');
  });

  it('validates a valid Tribe document', () => {
    const validTribe = {
      slug: 'angami',
      name: 'Angami',
      regionOrDistricts: 'Kohima, Dimapur, Chumoukedima',
      traditionalFestivalName: 'Sekrenyi',
      festivalDateOrSeason: 'February (starts 25th day)',
      traditions: 'Purification and sanctification festival',
      traditionalAttire: null, // Preserved null, not fabricated
      culturalSignificance: 'One of the major tribes hosting Hornbill',
      source: 'Hornbill Festival 2025 Handbook',
      status: 'draft' as const,
      metadata: {
        sourceWorkbook: 'Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx',
        sourceWorksheet: 'The 18 Tribes',
        sourceRow: 2,
        importedAt: new Date(),
        rawSourceStatus: 'Verified against 2025 Handbook',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const parsed = TribeSchema.safeParse(validTribe);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.status, 'draft');
      assert.equal(parsed.data.traditionalAttire, null);
    }
  });

  it('validates a valid KnowledgeItem document', () => {
    const validItem = {
      slug: 'flora-nature-rhododendron',
      category: 'flora_nature' as const,
      title: 'Rhododendron',
      subtitle: 'State Flower',
      content: 'Blooms across the hills during spring.',
      attributes: {
        localName: null,
        scientificName: 'Rhododendron arboreum',
      },
      source: 'Hornbill Festival 2025 Handbook',
      status: 'draft' as const,
      metadata: {
        sourceWorkbook: 'Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx',
        sourceWorksheet: 'Flora & Nature',
        sourceRow: 2,
        importedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const parsed = KnowledgeItemSchema.safeParse(validItem);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.status, 'draft');
      assert.equal(parsed.data.category, 'flora_nature');
    }
  });

  it('correctly handles cell value extraction', () => {
    assert.equal(extractCellValue(null), null);
    assert.equal(extractCellValue(undefined), null);
    assert.equal(extractCellValue('  Hello World  '), 'Hello World');
    assert.equal(extractCellValue(''), null);
    assert.equal(extractCellValue(12345), '12345');
    assert.equal(extractCellValue(true), 'true');
    assert.equal(
      extractCellValue({ richText: [{ text: 'Part 1 ' }, { text: 'Part 2' }] } as CellRichTextValue),
      'Part 1 Part 2'
    );
  });
});

describe('Data Layer - Workbook Parser & Importer', () => {
  it('finds the synthetic importer fixture workbook', () => {
    assert.equal(
      fs.existsSync(FIXTURE_WORKBOOK_PATH),
      true,
      `Synthetic fixture must exist at ${FIXTURE_WORKBOOK_PATH}`
    );
    // Production workbook remains gitignored under data/*.xlsx and is not required.
    assert.doesNotMatch(FIXTURE_WORKBOOK_PATH, /[\\/]data[\\/].*\.xlsx$/i);
  });

  it('parses the workbook accurately and satisfies data rules', async () => {
    const parsed = await parseHornbillWorkbook(FIXTURE_WORKBOOK_PATH);

    assert.equal(
      parsed.tribes.length,
      FIXTURE_TRIBE_COUNT,
      `Synthetic fixture must extract exactly ${FIXTURE_TRIBE_COUNT} tribes`
    );

    // Rule: Every tribe has status: "draft"
    for (const tribe of parsed.tribes) {
      assert.equal(tribe.status, 'draft');
      assert.ok(tribe.slug.length > 0);
      assert.ok(tribe.name.length > 0);
      assert.equal(tribe.metadata.sourceWorksheet, 'The 18 Tribes');
      assert.ok(tribe.metadata.sourceRow >= 2);
      // Fixture intentionally leaves attire null — importer must not fabricate it.
      assert.equal(tribe.traditionalAttire, null);
    }

    // Rule: Exclude Read Me and Missing Information sheets
    const skippedSheetNames = parsed.skippedSheets.map((s) => s.sheetName);
    assert.ok(skippedSheetNames.includes('Read Me'), 'Must skip Read Me sheet');
    assert.ok(
      skippedSheetNames.includes('Missing Information'),
      'Must skip Missing Information sheet'
    );

    const morungItems = parsed.knowledgeItems.filter((k) => k.category === 'morungs_overview');
    assert.equal(
      morungItems.length,
      FIXTURE_MORUNG_COUNT,
      `Morungs sheet must produce ${FIXTURE_MORUNG_COUNT} morung knowledge items in the fixture`
    );

    // Rule: All parsed records must have zero validation errors
    assert.equal(parsed.validationErrors.length, 0, 'No validation errors expected on workbook data');

    assert.equal(
      parsed.knowledgeItems.length,
      FIXTURE_KNOWLEDGE_ITEM_COUNT,
      `Must parse ${FIXTURE_KNOWLEDGE_ITEM_COUNT} knowledge items across fixture content sheets`
    );

    // Confirm categorized sheets were actually ingested (not bypassed).
    const categories = new Set(parsed.knowledgeItems.map((k) => k.category));
    for (const required of [
      'morungs_overview',
      'festival_overview',
      'geography_basics',
      'flora_nature',
      'adventure_trekking',
      'handicrafts_handlooms',
      'music_instruments',
      'kisama_heritage',
    ] as const) {
      assert.ok(categories.has(required), `Expected category ${required} from fixture`);
    }
  });

  it('runs dry-run import without writing to database', async () => {
    const parsed = await parseHornbillWorkbook(FIXTURE_WORKBOOK_PATH);
    const report = await executeImport(parsed, null, {
      dryRun: true,
      filePath: FIXTURE_WORKBOOK_PATH,
    });

    assert.equal(report.isDryRun, true);
    assert.equal(report.tribesStats.inserted, 0);
    assert.equal(report.tribesStats.updated, 0);
    assert.equal(report.knowledgeItemsStats.inserted, 0);
    assert.equal(report.knowledgeItemsStats.updated, 0);
    assert.equal(report.tribesStats.toInsert, FIXTURE_TRIBE_COUNT);
    assert.equal(report.knowledgeItemsStats.toInsert, FIXTURE_KNOWLEDGE_ITEM_COUNT);
    assert.equal(report.totalParsedRows, FIXTURE_TOTAL_PARSED_ROWS);
  });
});
