import * as fs from 'node:fs';
import * as path from 'node:path';
import ExcelJS from 'exceljs';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
} from '../../src/i18n/constants';
import {
  collectLeafKeys,
  ensureMetaBlock,
  extractPlaceholders,
  getStringAtPath,
  localeNamespaceFilePath,
  namespaceFromFile,
  readLocaleNamespace,
  resolveLocaleLayout,
  sameStringArray,
  setValueByPath,
  toError,
  writeJsonFile,
  type JsonObject,
} from './utils';

export const DEFAULT_HANDOFF_PATH = path.join('translations', 'handoff.xlsx');

const LOCALE_SHEET_HEADERS = ['key', 'en', 'translation'] as const;

const TRANSLATION_TARGET_LOCALES = SUPPORTED_LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE,
);
const TARGET_LOCALE_SET = new Set<string>(
  TRANSLATION_TARGET_LOCALES as readonly string[],
);

export type LocaleSheetRow = {
  key: string;
  en: string;
  translation: string;
};

type SpreadsheetRow = {
  locale: string;
  namespace: string;
  key: string;
  en: string;
  translation: string;
};

export interface ExportOptions {
  out: string;
  format: 'xlsx' | 'csv';
  locales: string[];
  namespaces: string[];
}

export interface ImportOptions {
  file: string;
  dryRun: boolean;
}

export interface ExportReport {
  exportedAt: string;
  format: 'xlsx' | 'csv';
  outputPath: string;
  namespaces: string[];
  targetLocales: string[];
  totalRows: number;
  perNamespace: Record<
    string,
    {
      totalKeys: number;
      exportedRows: number;
      emptyTranslations: number;
      perLocale: Record<
        string,
        { exportedRows: number; emptyTranslations: number; sameAsEn: number }
      >;
    }
  >;
}

type ImportSkipReason =
  | 'blank_cell'
  | 'unknown_namespace'
  | 'unknown_key'
  | 'invalid_locale'
  | 'placeholder_mismatch'
  | 'english_locale';

export interface ImportReport {
  importedAt: string;
  inputPath: string;
  dryRun: boolean;
  updated: string[];
  skipped: Record<ImportSkipReason, string[]>;
  stillMissing: string[];
  metaUpdated: string[];
}

export function parseCsvList(value: string | undefined): string[] | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function runScript(main: () => void | Promise<void>): void {
  Promise.resolve(main()).catch((error) => {
    console.error(`❌ ${toError(error).message}`);
    process.exit(1);
  });
}

export function writeReportFile(reportPath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function toFullKey(namespace: string, key: string): string {
  return `${namespace}.${key}`;
}

export function parseFullKey(
  fullKey: string,
  knownNamespaces: readonly string[],
): { namespace: string; key: string } | undefined {
  for (const namespace of [...knownNamespaces].sort(
    (a, b) => b.length - a.length,
  )) {
    if (fullKey === namespace) {
      return undefined;
    }

    const prefix = `${namespace}.`;
    if (fullKey.startsWith(prefix)) {
      return {
        namespace,
        key: fullKey.slice(prefix.length),
      };
    }
  }

  return undefined;
}

function rowId(locale: string, namespace: string, key: string): string {
  return `${locale}/${namespace}.${key}`;
}

export function resolveTargetLocales(requested?: string[]): string[] {
  const locales = requested?.length
    ? requested
    : [...TRANSLATION_TARGET_LOCALES];

  for (const locale of locales) {
    if (!TARGET_LOCALE_SET.has(locale)) {
      throw new Error(
        `Unsupported target locale "${locale}". Supported: ${[...TARGET_LOCALE_SET].join(', ')}`,
      );
    }
  }

  return locales;
}

export function resolveNamespaces(requested?: string[]): string[] {
  const { namespaceFiles } = resolveLocaleLayout();
  const available = namespaceFiles.map(namespaceFromFile);

  if (!requested?.length) {
    return available;
  }

  for (const namespace of requested) {
    if (!available.includes(namespace)) {
      throw new Error(
        `Unknown namespace "${namespace}". Available: ${available.join(', ')}`,
      );
    }
  }

  return requested;
}

function addSheetFromRows(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  rows: LocaleSheetRow[],
): void {
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = LOCALE_SHEET_HEADERS.map((header) => ({
    header,
    key: header,
  }));

  for (const row of rows) {
    worksheet.addRow(row);
  }
}

export async function writeSpreadsheet(
  sheets: Record<string, LocaleSheetRow[]>,
  outputPath: string,
  format: 'xlsx' | 'csv',
): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (format === 'csv') {
    const baseName = path.basename(outputPath, path.extname(outputPath));
    const dir = path.dirname(outputPath);

    for (const [locale, rows] of Object.entries(sheets)) {
      const workbook = new ExcelJS.Workbook();
      addSheetFromRows(workbook, locale, rows);
      await workbook.csv.writeFile(path.join(dir, `${baseName}.${locale}.csv`), {
        sheetName: locale,
      });
    }
    return;
  }

  const workbook = new ExcelJS.Workbook();
  for (const [locale, rows] of Object.entries(sheets)) {
    addSheetFromRows(workbook, locale, rows);
  }
  await workbook.xlsx.writeFile(outputPath);
}

function parseLocaleSheetRows(
  rawRows: Record<string, unknown>[],
  locale: string,
  sheetLabel: string,
  knownNamespaces: readonly string[],
): SpreadsheetRow[] {
  return rawRows.map((raw, index) => {
    const fullKey = String(raw.key ?? '').trim();
    const en = String(raw.en ?? '').trim();
    const translation = String(raw.translation ?? '').trim();

    if (!fullKey) {
      throw new Error(
        `Invalid row ${index + 2} in "${sheetLabel}": key is required`,
      );
    }

    const parsed = parseFullKey(fullKey, knownNamespaces);
    if (!parsed) {
      throw new Error(
        `Invalid row ${index + 2} in "${sheetLabel}": unknown key prefix in "${fullKey}"`,
      );
    }

    return {
      locale,
      namespace: parsed.namespace,
      key: parsed.key,
      en,
      translation,
    };
  });
}

function worksheetToRawRows(
  worksheet: ExcelJS.Worksheet,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const headerRow = worksheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values : [];
  const headers = headerValues
    .slice(1)
    .map((value) => String(value ?? '').trim().toLowerCase());

  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const rowValues = Array.isArray(row.values) ? row.values : [];
    const values = rowValues.slice(1);
    if (values.every((value) => String(value ?? '').trim().length === 0)) {
      continue;
    }

    const rawRow: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      rawRow[header] = values[index] ?? '';
    });
    rows.push(rawRow);
  }

  return rows;
}

async function readSpreadsheet(filePath: string): Promise<SpreadsheetRow[]> {
  const knownNamespaces = resolveNamespaces();

  if (filePath.endsWith('.csv')) {
    const localeMatch = path.basename(filePath).match(/\.([a-z]{2})\.csv$/i);
    if (!localeMatch) {
      throw new Error(
        'CSV import expects one locale per file (e.g. handoff.de.csv). Import each file separately or use xlsx.',
      );
    }

    const locale = localeMatch[1].toLowerCase();
    if (!TARGET_LOCALE_SET.has(locale)) {
      throw new Error(`Unsupported locale in filename: ${locale}`);
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = await workbook.csv.readFile(filePath);
    const sheetName = worksheet.name;
    if (!sheetName) {
      throw new Error('CSV file has no data');
    }

    const rawRows = worksheetToRawRows(worksheet);

    return parseLocaleSheetRows(
      rawRows,
      locale,
      path.basename(filePath),
      knownNamespaces,
    );
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  if (workbook.worksheets.length === 0) {
    throw new Error('Spreadsheet has no sheets');
  }

  const rows: SpreadsheetRow[] = [];

  for (const worksheet of workbook.worksheets) {
    const sheetName = worksheet.name;
    const locale = sheetName.trim().toLowerCase();
    if (!TARGET_LOCALE_SET.has(locale)) {
      throw new Error(
        `Unknown sheet "${sheetName}". Expected a target locale code (${[...TARGET_LOCALE_SET].join(', ')}).`,
      );
    }

    const rawRows = worksheetToRawRows(worksheet);

    rows.push(
      ...parseLocaleSheetRows(rawRows, locale, sheetName, knownNamespaces),
    );
  }

  return rows;
}

export function buildExportSheets(options: ExportOptions): {
  sheets: Record<string, LocaleSheetRow[]>;
  report: ExportReport;
} {
  const { namespaceFiles } = resolveLocaleLayout();
  const namespaceFilesByName = new Map(
    namespaceFiles.map((file) => [namespaceFromFile(file), file]),
  );

  const sheets: Record<string, LocaleSheetRow[]> = Object.fromEntries(
    options.locales.map((locale) => [locale, []]),
  );
  const perNamespace: ExportReport['perNamespace'] = {};
  let totalRows = 0;

  for (const namespace of options.namespaces) {
    const namespaceFile = namespaceFilesByName.get(namespace);
    if (!namespaceFile) {
      throw new Error(`Namespace file not found for "${namespace}"`);
    }

    const enJson = readLocaleNamespace(DEFAULT_LOCALE, namespaceFile);
    const keys = collectLeafKeys(enJson).sort();
    const localeJsonByLocale = new Map(
      options.locales.map((locale) => [
        locale,
        readLocaleNamespace(locale, namespaceFile),
      ]),
    );
    const perLocale: ExportReport['perNamespace'][string]['perLocale'] = {};
    let emptyTranslations = 0;

    for (const locale of options.locales) {
      const localeJson = localeJsonByLocale.get(locale)!;
      let localeEmpty = 0;
      let localeSameAsEn = 0;

      for (const key of keys) {
        const en = getStringAtPath(enJson, key);
        if (en === undefined) {
          continue;
        }

        const current = getStringAtPath(localeJson, key) ?? '';
        if (current.length === 0) {
          localeEmpty += 1;
          emptyTranslations += 1;
        } else if (current === en) {
          localeSameAsEn += 1;
        }

        sheets[locale].push({
          key: toFullKey(namespace, key),
          en,
          translation: current,
        });
        totalRows += 1;
      }

      perLocale[locale] = {
        exportedRows: keys.length,
        emptyTranslations: localeEmpty,
        sameAsEn: localeSameAsEn,
      };
    }

    perNamespace[namespace] = {
      totalKeys: keys.length,
      exportedRows: keys.length * options.locales.length,
      emptyTranslations,
      perLocale,
    };
  }

  for (const locale of options.locales) {
    sheets[locale].sort((a, b) => a.key.localeCompare(b.key));
  }

  return {
    sheets,
    report: {
      exportedAt: new Date().toISOString(),
      format: options.format,
      outputPath: options.out,
      namespaces: options.namespaces,
      targetLocales: options.locales,
      totalRows,
      perNamespace,
    },
  };
}

export async function importTranslations(
  options: ImportOptions,
): Promise<ImportReport> {
  const { namespaceFiles } = resolveLocaleLayout();
  const namespaceFilesByName = new Map(
    namespaceFiles.map((file) => [namespaceFromFile(file), file]),
  );

  const report: ImportReport = {
    importedAt: new Date().toISOString(),
    inputPath: options.file,
    dryRun: options.dryRun,
    updated: [],
    skipped: {
      blank_cell: [],
      unknown_namespace: [],
      unknown_key: [],
      invalid_locale: [],
      placeholder_mismatch: [],
      english_locale: [],
    },
    stillMissing: [],
    metaUpdated: [],
  };

  const enCache = new Map<string, JsonObject>();
  const localeCache = new Map<string, JsonObject>();
  const touchedFiles = new Set<string>();

  const loadEn = (namespace: string): JsonObject => {
    if (!enCache.has(namespace)) {
      const file = namespaceFilesByName.get(namespace)!;
      enCache.set(namespace, readLocaleNamespace(DEFAULT_LOCALE, file));
    }
    return enCache.get(namespace)!;
  };

  const loadLocale = (locale: string, namespace: string): JsonObject => {
    const cacheKey = `${locale}:${namespace}`;
    if (!localeCache.has(cacheKey)) {
      const file = namespaceFilesByName.get(namespace)!;
      localeCache.set(cacheKey, readLocaleNamespace(locale, file));
    }
    return localeCache.get(cacheKey)!;
  };

  for (const row of await readSpreadsheet(options.file)) {
    const id = rowId(row.locale, row.namespace, row.key);

    if (row.locale === DEFAULT_LOCALE) {
      report.skipped.english_locale.push(id);
      continue;
    }

    if (!TARGET_LOCALE_SET.has(row.locale)) {
      report.skipped.invalid_locale.push(id);
      continue;
    }

    if (!namespaceFilesByName.has(row.namespace)) {
      report.skipped.unknown_namespace.push(id);
      continue;
    }

    const enValue = getStringAtPath(loadEn(row.namespace), row.key);
    if (enValue === undefined) {
      report.skipped.unknown_key.push(id);
      continue;
    }

    if (row.translation.length === 0) {
      report.skipped.blank_cell.push(id);
      continue;
    }

    if (
      !sameStringArray(
        extractPlaceholders(enValue),
        extractPlaceholders(row.translation),
      )
    ) {
      report.skipped.placeholder_mismatch.push(id);
      continue;
    }

    setValueByPath(loadLocale(row.locale, row.namespace), row.key, row.translation);
    touchedFiles.add(`${row.locale}:${row.namespace}`);
    report.updated.push(id);
  }

  if (!options.dryRun) {
    for (const touched of touchedFiles) {
      const [locale, namespace] = touched.split(':');
      const namespaceFile = namespaceFilesByName.get(namespace)!;
      const localeJson = loadLocale(locale, namespace);
      ensureMetaBlock(localeJson, locale, report.importedAt);
      writeJsonFile(localeNamespaceFilePath(locale, namespaceFile), localeJson);
      report.metaUpdated.push(`${locale}/${namespaceFile}`);
    }
  }

  for (const namespace of namespaceFiles.map(namespaceFromFile)) {
    const enJson = loadEn(namespace);
    for (const locale of TRANSLATION_TARGET_LOCALES) {
      const localeJson = loadLocale(locale, namespace);
      for (const key of collectLeafKeys(enJson)) {
        const value = getStringAtPath(localeJson, key);
        if (value === undefined || value.length === 0) {
          report.stillMissing.push(`${locale}/${namespace}.${key}`);
        }
      }
    }
  }

  return report;
}

function printPreview(items: string[], limit: number): void {
  items.slice(0, limit).forEach((entry) => console.log(`    ${entry}`));
  if (items.length > limit) {
    console.log(`    ... and ${items.length - limit} more`);
  }
}

export function printExportReport(report: ExportReport): void {
  console.log('\nExport summary');
  console.log(`  Output: ${report.outputPath}`);
  console.log(`  Format: ${report.format}`);
  console.log(`  Columns: key | en | translation`);
  console.log(`  Key format: {namespace}.{path} (e.g. catalog.genders.MALE)`);
  console.log(`  Namespaces: ${report.namespaces.join(', ')}`);
  console.log(`  Target locales: ${report.targetLocales.join(', ')}`);
  console.log(`  Sheets: one per locale (${report.targetLocales.join(', ')})`);
  console.log(`  Total rows: ${report.totalRows}`);

  for (const namespace of report.namespaces) {
    const stats = report.perNamespace[namespace];
    console.log(`\n  ${namespace}:`);
    console.log(`    keys (en): ${stats.totalKeys}`);
    console.log(`    exported rows: ${stats.exportedRows}`);
    console.log(`    empty translations: ${stats.emptyTranslations}`);

    for (const locale of report.targetLocales) {
      const localeStats = stats.perLocale[locale];
      console.log(
        `    ${locale}: ${localeStats.exportedRows} rows, ${localeStats.emptyTranslations} empty, ${localeStats.sameAsEn} same as en`,
      );
    }
  }
}

export function printImportReport(report: ImportReport): void {
  const skipLabels: Array<[ImportSkipReason, string]> = [
    ['blank_cell', 'Skipped (blank cell)'],
    ['unknown_namespace', 'Skipped (unknown namespace)'],
    ['unknown_key', 'Skipped (unknown key)'],
    ['invalid_locale', 'Skipped (invalid locale)'],
    ['placeholder_mismatch', 'Skipped (placeholder mismatch)'],
    ['english_locale', 'Skipped (english locale)'],
  ];

  console.log('\nImport summary');
  console.log(`  File: ${report.inputPath}`);
  console.log(`  Dry run: ${report.dryRun ? 'yes' : 'no'}`);
  console.log(`  Updated: ${report.updated.length}`);

  if (report.updated.length > 0) {
    printPreview(report.updated, 20);
  }

  for (const [key, label] of skipLabels) {
    console.log(`  ${label}: ${report.skipped[key].length}`);
    printPreview(report.skipped[key], 10);
  }

  console.log(`  Still missing after import: ${report.stillMissing.length}`);
  printPreview(report.stillMissing, 20);

  if (report.metaUpdated.length > 0) {
    console.log(`  meta.lastImportedAt updated:`);
    report.metaUpdated.forEach((entry) => console.log(`    ${entry}`));
  }
}
