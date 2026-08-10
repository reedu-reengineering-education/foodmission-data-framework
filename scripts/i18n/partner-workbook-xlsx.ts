/**
 * Spreadsheet layout for the partner translation workbook.
 *
 * One sheet per category, columns: key | en | <locale> …
 * Row 1 holds the machine-readable headers — the importer matches columns by
 * those names, so partners must not rename or reorder them.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import ExcelJS from 'exceljs';
import {
  README_SHEET,
  type Category,
  type WorkbookEntry,
} from './partner-workbook';

const HEADER_FILL = 'FF1F3864';
const READONLY_HEADER_FILL = 'FF7F7F7F';
const MISSING_FILL = 'FFFFF2CC';

export type SheetData = {
  category: Category;
  entries: WorkbookEntry[];
};

export type SheetRow = {
  /** 1-based row number in the sheet, for error messages. */
  rowNumber: number;
  key: string;
  en: string;
  /** locale -> cell value, only for locale columns present in the sheet. */
  translations: Record<string, string>;
};

export type ParsedSheet = {
  name: string;
  locales: string[];
  rows: SheetRow[];
};

function columnLetter(index: number): string {
  let letter = '';
  let remaining = index;
  while (remaining > 0) {
    const modulo = (remaining - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    remaining = Math.floor((remaining - modulo) / 26);
  }
  return letter;
}

function addInstructionsSheet(
  workbook: ExcelJS.Workbook,
  sheets: SheetData[],
  locales: string[],
): void {
  const sheet = workbook.addWorksheet(README_SHEET);
  sheet.columns = [
    { key: 'a', width: 26 },
    { key: 'b', width: 52 },
    { key: 'c', width: 22 },
    { key: 'd', width: 14 },
    ...locales.map((locale) => ({ key: locale, width: 8 })),
  ];

  const title = sheet.addRow(['FOODMISSION translation workbook']);
  title.font = { bold: true, size: 14 };
  sheet.addRow([`Exported: ${new Date().toISOString()}`]);
  sheet.addRow([]);

  for (const line of [
    'How to use this file:',
    '1. Every sheet below is one content category. Translate into the column of your language code.',
    '2. Only edit the language columns. The "key" and "en" columns are the identity of the row — editing them drops the row on import.',
    '3. Leave a cell empty to keep the current value in the repository. Delete nothing.',
    '4. Keep {{placeholders}} exactly as they appear in the English text — rows with mismatching placeholders are rejected.',
    '5. Do not add, remove, rename or reorder sheets, columns or the header row. Adding rows has no effect.',
    '6. Send the file back as .xlsx.',
  ]) {
    sheet.addRow([line]);
  }

  sheet.addRow([]);
  const header = sheet.addRow([
    'sheet',
    'content',
    'source file',
    'seeded by',
    ...locales,
  ]);
  header.font = { bold: true };

  for (const { category, entries } of sheets) {
    const missing = locales.map(
      (locale) =>
        entries.filter((entry) => !entry.translations[locale]?.trim()).length,
    );
    sheet.addRow([
      category.id,
      `${category.title} (${entries.length} rows)`,
      category.source,
      category.seededBy,
      ...missing,
    ]);
  }

  sheet.addRow([]);
  sheet.addRow([
    'Numbers per language column = rows still missing a translation.',
  ]);
}

function addCategorySheet(
  workbook: ExcelJS.Workbook,
  { category, entries }: SheetData,
  locales: string[],
): void {
  const sheet = workbook.addWorksheet(category.id);
  sheet.columns = [
    { header: 'key', key: 'key', width: 44 },
    { header: 'en', key: 'en', width: 60 },
    ...locales.map((locale) => ({ header: locale, key: locale, width: 48 })),
  ];

  for (const entry of entries) {
    const row = sheet.addRow({
      key: entry.key,
      en: entry.en,
      ...Object.fromEntries(
        locales.map((locale) => [locale, entry.translations[locale] ?? '']),
      ),
    });
    row.alignment = { vertical: 'top', wrapText: true };
    // Force text so codes like NEVO numbers survive the round trip.
    row.getCell('key').numFmt = '@';
  }

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colNumber <= 2 ? READONLY_HEADER_FILL : HEADER_FILL },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];

  const lastColumn = columnLetter(2 + locales.length);
  const lastRow = Math.max(entries.length + 1, 2);
  sheet.autoFilter = { from: 'A1', to: `${lastColumn}1` };

  // Highlight untranslated cells so partners see the remaining work.
  sheet.addConditionalFormatting({
    ref: `C2:${lastColumn}${lastRow}`,
    rules: [
      {
        type: 'expression',
        priority: 1,
        formulae: ['LEN(TRIM(C2))=0'],
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: MISSING_FILL },
          },
        },
      },
    ],
  });
}

export async function writeWorkbook(
  sheets: SheetData[],
  locales: string[],
  outputPath: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'foodmission-data-framework';
  workbook.created = new Date();

  addInstructionsSheet(workbook, sheets, locales);
  for (const sheet of sheets) {
    addCategorySheet(workbook, sheet, locales);
  }

  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  await workbook.xlsx.writeFile(outputPath);
}

function primitiveText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return '';
}

/** Cells can come back as rich text, hyperlinks or formula results. */
function cellText(value: ExcelJS.CellValue): string {
  if (value !== null && typeof value === 'object') {
    if ('richText' in value) {
      return value.richText.map((part) => part.text).join('');
    }
    if ('text' in value) {
      return primitiveText(value.text);
    }
    if ('result' in value) {
      return primitiveText(value.result);
    }
  }
  return primitiveText(value);
}

export async function readWorkbook(
  filePath: string,
  knownLocales: string[],
): Promise<ParsedSheet[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheets: ParsedSheet[] = [];

  for (const worksheet of workbook.worksheets) {
    if (worksheet.name.trim().toLowerCase() === README_SHEET.toLowerCase()) {
      continue;
    }

    const headerToColumn = new Map<string, number>();
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      const name = cellText(cell.value).trim().toLowerCase();
      if (name) {
        headerToColumn.set(name, colNumber);
      }
    });

    const keyColumn = headerToColumn.get('key');
    const enColumn = headerToColumn.get('en');
    if (!keyColumn || !enColumn) {
      throw new Error(
        `Sheet "${worksheet.name}" must have "key" and "en" columns in row 1`,
      );
    }

    const locales = knownLocales.filter((locale) => headerToColumn.has(locale));
    const rows: SheetRow[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      const key = cellText(row.getCell(keyColumn).value).trim();
      if (!key) {
        return;
      }

      rows.push({
        rowNumber,
        key,
        en: cellText(row.getCell(enColumn).value).trim(),
        translations: Object.fromEntries(
          locales.map((locale) => [
            locale,
            cellText(row.getCell(headerToColumn.get(locale)!).value).trim(),
          ]),
        ),
      });
    });

    sheets.push({ name: worksheet.name.trim(), locales, rows });
  }

  return sheets;
}
