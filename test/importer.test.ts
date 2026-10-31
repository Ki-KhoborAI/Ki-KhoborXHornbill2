import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { parseHornbillWorkbook, executeImport, extractCellValue } from '../src/modules/content/importer.js';
import { TribeSchema, KnowledgeItemSchema, slugify } from '../src/modules/content/schemas.js';

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
      extractCellValue({ richText: [{ text: 'Part 1 ' }, { text: 'Part 2' }] } as any),
      'Part 1 Part 2'
    );
  });
});

describe('Data Layer - Workbook Parser & Importer', () => {
  const workbookPath = path.resolve(
    process.cwd(),
    'data',
    'Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx'
  );

  it('finds the actual workbook file in data/', () => {
    assert.equal(fs.existsSync(workbookPath), true, `Workbook must exist at ${workbookPath}`);
  });

  it('parses the workbook accurately and satisfies data rules', async () => {
    const parsed = await parseHornbillWorkbook(workbookPath);

    // Rule: Exactly 18 tribes parsed
    assert.equal(parsed.tribes.length, 18, 'Must extract exactly 18 recognized tribes');

    // Rule: Every tribe has status: "draft"
    for (const tribe of parsed.tribes) {
      assert.equal(tribe.status, 'draft');
      assert.ok(tribe.slug.length > 0);
      assert.ok(tribe.name.length > 0);
      assert.equal(tribe.metadata.sourceWorksheet, 'The 18 Tribes');
      assert.ok(tribe.metadata.sourceRow >= 2);
    }

    // Rule: Exclude Read Me and Missing Information sheets
    const skippedSheetNames = parsed.skippedSheets.map((s) => s.sheetName);
    assert.ok(skippedSheetNames.includes('Read Me'), 'Must skip Read Me sheet');
    assert.ok(skippedSheetNames.includes('Missing Information'), 'Must skip Missing Information sheet');

    // Morungs sheet produces 18 items (general overview + individual tribe morungs)
    const morungItems = parsed.knowledgeItems.filter((k) => k.category === 'morungs_overview');
    assert.equal(
      morungItems.length,
      18,
      'Morungs sheet must produce 18 morung knowledge items'
    );

    // Rule: All parsed records must have zero validation errors
    assert.equal(parsed.validationErrors.length, 0, 'No validation errors expected on workbook data');

    // Rule: Total knowledge items parsed
    assert.equal(parsed.knowledgeItems.length, 85, 'Must parse 85 knowledge items across content sheets');
  });

  it('runs dry-run import without writing to database', async () => {
    const parsed = await parseHornbillWorkbook(workbookPath);
    const report = await executeImport(parsed, null, {
      dryRun: true,
      filePath: workbookPath,
    });

    assert.equal(report.isDryRun, true);
    assert.equal(report.tribesStats.inserted, 0);
    assert.equal(report.tribesStats.updated, 0);
    assert.equal(report.knowledgeItemsStats.inserted, 0);
    assert.equal(report.knowledgeItemsStats.updated, 0);
    assert.equal(report.tribesStats.toInsert, 18);
    assert.equal(report.knowledgeItemsStats.toInsert, 85);
    assert.equal(report.totalParsedRows, 103);
  });
});
