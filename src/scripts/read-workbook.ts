/**
 * Scratch script: Reads all remaining worksheets from the Excel workbook
 * and outputs their headers, row count, and raw content as JSON.
 */
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

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

function extractCellValue(val: ExcelJS.CellValue): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') {
    if ('richText' in val && Array.isArray((val as any).richText)) {
      const text = (val as any).richText.map((rt: any) => rt.text).join('').trim();
      return text.length > 0 ? text : null;
    }
    if ('text' in val && typeof (val as any).text === 'string') {
      const text = (val as any).text.trim();
      return text.length > 0 ? text : null;
    }
    if ('result' in val && (val as any).result !== undefined) {
      const text = String((val as any).result).trim();
      return text.length > 0 ? text : null;
    }
    return JSON.stringify(val);
  }
  return null;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);

  const result: Record<string, any> = {};

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
    console.log(`Headers: ${(data as any).headers.join(' | ')}`);
    console.log(`Data rows: ${(data as any).rowCount}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
