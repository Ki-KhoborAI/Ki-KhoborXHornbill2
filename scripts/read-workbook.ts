/**
 * Scratch script: Reads all remaining worksheets from the Excel workbook
 * and outputs their headers, row count, and raw content as JSON.
 */
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { extractCellValue } from '../lib/importer/importer.js';

const WORKBOOK_PATH = path.resolve('data', 'Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx');

const TARGET_SHEETS = [
  'Nagaland Basics',
  'Morungs',
  'Flora & Nature',
  'Adventure & Trekking',
  'Handicrafts & Handlooms',
  'Music & Instruments',
  'Hornbill Festival & Kisama',
  'Missing Information',
];

/** One worksheet dump written to workbook_raw_dump.json */
type SheetDump = {
  headers: string[];
  rowCount: number;
  rows: Record<string, string | null>[];
};

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);

  const result: Record<string, SheetDump> = {};

  for (const worksheet of workbook.worksheets) {
    const name = worksheet.name;
    if (!TARGET_SHEETS.includes(name)) continue;

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const val = extractCellValue(cell.value);
      headers[colNumber] = val ?? `col_${colNumber}`;
    });

    const rows: Record<string, string | null>[] = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData: Record<string, string | null> = { _rowNumber: String(rowNumber) };
      let hasAny = false;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          const val = extractCellValue(cell.value);
          rowData[header] = val;
          if (val !== null) hasAny = true;
        }
      });
      if (hasAny) rows.push(rowData);
    });

    result[name] = {
      headers: headers.filter(Boolean),
      rowCount: rows.length,
      rows,
    };
  }

  fs.mkdirSync(path.resolve('data', 'generated'), { recursive: true });
  const outPath = path.resolve('data', 'workbook_raw_dump.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Written to ${outPath}`);

  // Print summary
  for (const [sheet, data] of Object.entries(result)) {
    console.log(`\n=== ${sheet} ===`);
    console.log(`Headers: ${data.headers.join(' | ')}`);
    console.log(`Data rows: ${data.rowCount}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
