import path from 'path';
import ExcelJS from 'exceljs';
import type { Db } from 'mongodb';
import {
  TribeSchema,
  KnowledgeItemSchema,
  slugify,
  type Tribe,
  type KnowledgeItem,
} from './schemas.js';

/**
 * Data structure representing parsed rows from the workbook before database interaction.
 */
export interface ParsedWorkbookData {
  workbookName: string;
  tribes: Tribe[];
  knowledgeItems: KnowledgeItem[];
  skippedSheets: { sheetName: string; reason: string }[];
  skippedRows: { sheetName: string; rowNumber: number; reason: string }[];
  validationErrors: { sheetName: string; rowNumber: number; error: string }[];
  incompleteRowNotices: { sheetName: string; rowNumber: number; item: string; notice: string }[];
}

/**
 * Execution report for the import run.
 */
export interface ImportReport {
  isDryRun: boolean;
  workbookPath: string;
  totalParsedRows: number;
  tribesStats: {
    total: number;
    toInsert: number;
    toUpdate: number;
    inserted: number;
    updated: number;
  };
  knowledgeItemsStats: {
    total: number;
    byCategory: Record<string, number>;
    toInsert: number;
    toUpdate: number;
    inserted: number;
    updated: number;
  };
  skippedSheets: { sheetName: string; reason: string }[];
  skippedRowsCount: number;
  validationErrors: { sheetName: string; rowNumber: number; error: string }[];
  incompleteRowNotices: { sheetName: string; rowNumber: number; item: string; notice: string }[];
}

/**
 * Extract clean string or null from any ExcelJS cell value format
 * (handles plain string, number, richText, hyperlink, formulas).
 */
export function extractCellValue(val: ExcelJS.CellValue): string | null {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (typeof val === 'object') {
    // RichText cell
    if ('richText' in val && Array.isArray(val.richText)) {
      const text = val.richText.map((rt) => rt.text).join('').trim();
      return text.length > 0 ? text : null;
    }
    // Hyperlink cell
    if ('text' in val && typeof val.text === 'string') {
      const text = val.text.trim();
      return text.length > 0 ? text : null;
    }
    // Formula result
    if ('result' in val && val.result !== undefined && val.result !== null) {
      const text = String(val.result).trim();
      return text.length > 0 ? text : null;
    }
    return JSON.stringify(val);
  }
  return null;
}

/**
 * Reads and parses the Hornbill 2026 Excel workbook into validated domain models.
 */
export async function parseHornbillWorkbook(filePath: string): Promise<ParsedWorkbookData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const workbookName = path.basename(filePath);

  const tribes: Tribe[] = [];
  const knowledgeItems: KnowledgeItem[] = [];
  const skippedSheets: { sheetName: string; reason: string }[] = [];
  const skippedRows: { sheetName: string; rowNumber: number; reason: string }[] = [];
  const validationErrors: { sheetName: string; rowNumber: number; error: string }[] = [];
  const incompleteRowNotices: { sheetName: string; rowNumber: number; item: string; notice: string }[] = [];

  for (const worksheet of workbook.worksheets) {
    const sheetName = worksheet.name;

    // Rule: Do not import Read Me or Missing Information sheets as public knowledge records
    if (sheetName === 'Read Me') {
      skippedSheets.push({
        sheetName,
        reason: 'Instructional metadata tab; intentionally excluded from database ingestion.',
      });
      continue;
    }
    if (sheetName === 'Missing Information') {
      skippedSheets.push({
        sheetName,
        reason: 'Internal research backlog tab; intentionally excluded from database ingestion.',
      });
      continue;
    }

    // Read header row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const val = extractCellValue(cell.value);
      headers[colNumber] = val ?? `col_${colNumber}`;
    });

    // Iterate through data rows (starting at row 2)
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData: Record<string, string | null> = {};
      let hasAnyValue = false;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          const val = extractCellValue(cell.value);
          rowData[header] = val;
          if (val !== null) hasAnyValue = true;
        }
      });

      if (!hasAnyValue) {
        skippedRows.push({ sheetName, rowNumber, reason: 'Completely blank row' });
        return;
      }

      // Handle "The 18 Tribes" sheet
      if (sheetName === 'The 18 Tribes') {
        const tribeName = rowData['Tribe Name'];
        if (!tribeName) {
          skippedRows.push({ sheetName, rowNumber, reason: 'Missing Tribe Name in row' });
          return;
        }

        const rawTribe: Tribe = {
          slug: slugify(tribeName),
          name: tribeName,
          regionOrDistricts: rowData['Region or Districts'] ?? null,
          traditionalFestivalName: rowData['Traditional Festival Name'] ?? null,
          festivalDateOrSeason: rowData['Festival Date or Season'] ?? null,
          traditions: rowData['Traditions'] ?? null,
          traditionalAttire: rowData['Traditional Attire'] ?? null,
          culturalSignificance: rowData['Cultural Significance'] ?? null,
          source: rowData['Source (name or link)'] ?? null,
          status: 'draft',
          metadata: {
            sourceWorkbook: workbookName,
            sourceWorksheet: sheetName,
            sourceRow: rowNumber,
            importedAt: new Date(),
            rawSourceStatus: rowData['Status'] ?? null,
            sourceCitation: rowData['Source (name or link)'] ?? null,
            notes: rowData['Notes'] ?? null,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const validation = TribeSchema.safeParse(rawTribe);
        if (!validation.success) {
          validationErrors.push({
            sheetName,
            rowNumber,
            error: validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
          });
        } else {
          tribes.push(validation.data);

          // Note incomplete fields for transparency without fabricating values
          if (!rawTribe.traditionalAttire) {
            incompleteRowNotices.push({
              sheetName,
              rowNumber,
              item: tribeName,
              notice: 'Traditional Attire is missing (source handbook had visual-only attire).',
            });
          }
          if (!rawTribe.regionOrDistricts) {
            incompleteRowNotices.push({
              sheetName,
              rowNumber,
              item: tribeName,
              notice: 'Region/Districts is empty in source sheet.',
            });
          }
          if (!rawTribe.traditions) {
            incompleteRowNotices.push({
              sheetName,
              rowNumber,
              item: tribeName,
              notice: 'Traditions column is marked as Not Started / empty.',
            });
          }
        }
        return;
      }

      // Handle "Morungs" sheet
      // Parses the general overview item as well as individual tribe morung items.
      if (sheetName === 'Morungs') {
        const morungName = rowData['Morung Name'];
        if (!morungName) {
          skippedRows.push({ sheetName, rowNumber, reason: 'Missing Morung Name in row' });
          return;
        }

        const rawItem: KnowledgeItem = {
          slug: slugify(`morungs-overview-${morungName}`),
          category: 'morungs_overview',
          title: morungName,
          subtitle: 'Naga Heritage Village Kisama Morungs Overview',
          content: rowData['Cultural Significance'] ?? null,
          attributes: {
            architecturalFeatures: rowData['Architectural Features'] ?? null,
            traditionalObjectsOrDisplays: rowData['Traditional Objects or Displays'] ?? null,
            informationStillMissing: rowData['Information Still Missing'] ?? null,
            handbookNotes: rowData['Notes'] ?? null,
          },
          source: rowData['Source (name or link)'] ?? null,
          status: 'draft',
          metadata: {
            sourceWorkbook: workbookName,
            sourceWorksheet: sheetName,
            sourceRow: rowNumber,
            importedAt: new Date(),
            rawSourceStatus: rowData['Status'] ?? null,
            sourceCitation: rowData['Source (name or link)'] ?? null,
            notes: rowData['Notes'] ?? null,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const validation = KnowledgeItemSchema.safeParse(rawItem);
        if (!validation.success) {
          validationErrors.push({
            sheetName,
            rowNumber,
            error: validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
          });
        } else {
          knowledgeItems.push(validation.data);
          incompleteRowNotices.push({
            sheetName,
            rowNumber,
            item: morungName,
            notice: 'General Morung description mapped to knowledge_items. Individual Morung records are deferred until verified data is compiled.',
          });
        }
        return;
      }

      // Handle Categorized Knowledge Sheets
      let category: KnowledgeItem['category'] | null = null;
      let title: string | null = null;
      let subtitle: string | null = null;
      let content: string | null = null;
      const attributes: Record<string, unknown> = {};

      if (sheetName === 'Festival Overview') {
        category = 'festival_overview';
        title = rowData['Topic'];
        content = rowData['Details'];
      } else if (sheetName === 'Nagaland Basics') {
        category = 'geography_basics';
        title = rowData['Item'];
        subtitle = rowData['Category'];
        content = rowData['Details'];
        attributes.originalCategory = rowData['Category'];
      } else if (sheetName === 'Flora & Nature') {
        category = 'flora_nature';
        title = rowData['Name'];
        subtitle = rowData['Type'];
        content = rowData['Significance'];
        attributes.localName = rowData['Local Name'];
        attributes.scientificName = rowData['Scientific Name (only if verified)'];
        attributes.location = rowData['Location'];
      } else if (sheetName === 'Adventure & Trekking') {
        category = 'adventure_trekking';
        title = rowData['Name'];
        subtitle = rowData['Activity Type'];
        content = rowData['Safety Information'];
        attributes.activityType = rowData['Activity Type'];
        attributes.location = rowData['Location'];
        attributes.difficulty = rowData['Difficulty'];
        attributes.approximateDuration = rowData['Approximate Duration'];
        attributes.bestSeason = rowData['Best Season'];
      } else if (sheetName === 'Handicrafts & Handlooms') {
        category = 'handicrafts_handlooms';
        title = rowData['Craft Name'];
        subtitle = rowData['Materials'];
        content = rowData['Cultural Significance'] || rowData['How It Is Made'];
        attributes.materials = rowData['Materials'];
        attributes.howItIsMade = rowData['How It Is Made'];
        attributes.culturalSignificance = rowData['Cultural Significance'];
        attributes.whereMadeOrSold = rowData['Where It Is Made or Sold'];
        attributes.artisanInfo = rowData['Artisan Information'];
        attributes.associatedTribe = rowData['Associated Tribe (only if verified)'];
      } else if (sheetName === 'Music & Instruments') {
        category = 'music_instruments';
        title = rowData['Name'];
        subtitle = rowData['Category'];
        content = rowData['Description'];
        attributes.culturalSignificance = rowData['Cultural Significance'];
        attributes.associatedTribe = rowData['Associated Tribe (only if verified)'];
      } else if (sheetName === 'Hornbill Festival & Kisama') {
        category = 'kisama_heritage';
        title = rowData['Item'];
        subtitle = rowData['Category'];
        content = rowData['Details'];
        attributes.originalCategory = rowData['Category'];
      }

      if (!category || !title) {
        skippedRows.push({
          sheetName,
          rowNumber,
          reason: `Could not determine valid category or title from row`,
        });
        return;
      }

      const slugPrefix = category.replace(/_/g, '-');
      const slugTitle = subtitle ? `${subtitle}-${title}` : title;
      const slug = slugify(`${slugPrefix}-${slugTitle}`);

      const rawItem: KnowledgeItem = {
        slug,
        category,
        title,
        subtitle,
        content,
        attributes,
        source: rowData['Source (name or link)'] ?? null,
        status: 'draft',
        metadata: {
          sourceWorkbook: workbookName,
          sourceWorksheet: sheetName,
          sourceRow: rowNumber,
          importedAt: new Date(),
          rawSourceStatus: rowData['Status'] ?? null,
          sourceCitation: rowData['Source (name or link)'] ?? null,
          notes: rowData['Notes'] ?? null,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const validation = KnowledgeItemSchema.safeParse(rawItem);
      if (!validation.success) {
        validationErrors.push({
          sheetName,
          rowNumber,
          error: validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
        });
      } else {
        knowledgeItems.push(validation.data);

        // Track empty details/content
        if (!content) {
          incompleteRowNotices.push({
            sheetName,
            rowNumber,
            item: title,
            notice: 'Content/Details is missing or unpopulated in source sheet.',
          });
        }
      }
    });
  }

  return {
    workbookName,
    tribes,
    knowledgeItems,
    skippedSheets,
    skippedRows,
    validationErrors,
    incompleteRowNotices,
  };
}

/**
 * Runs the importer in either dry-run mode or real write mode with idempotent upserts.
 */
export async function executeImport(
  parsed: ParsedWorkbookData,
  db: Db | null,
  options: { dryRun: boolean; filePath: string }
): Promise<ImportReport> {
  const { dryRun, filePath } = options;

  // Initialize report structure
  const report: ImportReport = {
    isDryRun: dryRun,
    workbookPath: filePath,
    totalParsedRows: parsed.tribes.length + parsed.knowledgeItems.length,
    tribesStats: {
      total: parsed.tribes.length,
      toInsert: 0,
      toUpdate: 0,
      inserted: 0,
      updated: 0,
    },
    knowledgeItemsStats: {
      total: parsed.knowledgeItems.length,
      byCategory: {},
      toInsert: 0,
      toUpdate: 0,
      inserted: 0,
      updated: 0,
    },
    skippedSheets: parsed.skippedSheets,
    skippedRowsCount: parsed.skippedRows.length,
    validationErrors: parsed.validationErrors,
    incompleteRowNotices: parsed.incompleteRowNotices,
  };

  // Group knowledge items by category
  for (const item of parsed.knowledgeItems) {
    report.knowledgeItemsStats.byCategory[item.category] =
      (report.knowledgeItemsStats.byCategory[item.category] || 0) + 1;
  }

  // If DB is connected, calculate existing records for toInsert / toUpdate
  if (db) {
    const tribesCollection = db.collection<Tribe>('tribes');
    const knowledgeCollection = db.collection<KnowledgeItem>('knowledge_items');

    // Check tribes
    for (const tribe of parsed.tribes) {
      const existing = await tribesCollection.findOne({ slug: tribe.slug });
      if (existing) {
        report.tribesStats.toUpdate++;
      } else {
        report.tribesStats.toInsert++;
      }
    }

    // Check knowledge items
    for (const item of parsed.knowledgeItems) {
      const existing = await knowledgeCollection.findOne({ slug: item.slug });
      if (existing) {
        report.knowledgeItemsStats.toUpdate++;
      } else {
        report.knowledgeItemsStats.toInsert++;
      }
    }

    // If real write mode, perform idempotent upserts and ensure indexes
    if (!dryRun) {
      // 1. Ensure unique indexes on slugs
      await tribesCollection.createIndex({ slug: 1 }, { unique: true });
      await knowledgeCollection.createIndex({ slug: 1 }, { unique: true });
      await knowledgeCollection.createIndex({ category: 1 });
      await knowledgeCollection.createIndex({ status: 1 });

      // 2. Upsert tribes
      for (const tribe of parsed.tribes) {
        const result = await tribesCollection.updateOne(
          { slug: tribe.slug },
          {
            $set: {
              ...tribe,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
        if (result.upsertedCount > 0) {
          report.tribesStats.inserted++;
        } else if (result.matchedCount > 0) {
          report.tribesStats.updated++;
        }
      }

      // 3. Upsert knowledge items
      for (const item of parsed.knowledgeItems) {
        const result = await knowledgeCollection.updateOne(
          { slug: item.slug },
          {
            $set: {
              ...item,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
        if (result.upsertedCount > 0) {
          report.knowledgeItemsStats.inserted++;
        } else if (result.matchedCount > 0) {
          report.knowledgeItemsStats.updated++;
        }
      }
    }
  } else {
    // If DB is offline / disconnected in dry-run, all valid records are pending insertion
    report.tribesStats.toInsert = parsed.tribes.length;
    report.knowledgeItemsStats.toInsert = parsed.knowledgeItems.length;
  }

  return report;
}
