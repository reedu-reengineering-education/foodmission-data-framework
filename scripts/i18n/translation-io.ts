import * as fs from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';
import {
  DEFAULT_LOCALE,
  TRANSLATION_TARGET_LOCALES,
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
  writeJsonFile,
  type JsonObject,
} from './utils';

/** Export/import columns: one sheet per locale. */
export const LOCALE_SHEET_HEADERS = ['key', 'en', 'translation'] as const;

export type LocaleSheetRow = {
  key: string;
  en: string;
  translation: string;
};

export type SpreadsheetRow = {
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

export interface ImportReport {
  importedAt: string;
  inputPath: string;
  dryRun: boolean;
  updated: string[];
  skipped: {
    blank_cell: string[];
    unknown_namespace: string[];
    unknown_key: string[];
    invalid_locale: string[];
    placeholder_mismatch: string[];
    english_locale: string[];
  };
  stillMissing: string[];
  metaUpdated: string[];
}

const targetLocaleSet = new Set<string>(
  TRANSLATION_TARGET_LOCALES as readonly string[],
);

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

export function parseCsvList(value: string | undefined): string[] | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function resolveTargetLocales(requested?: string[]): string[] {
  const locales = requested?.length
    ? requested
    : [...TRANSLATION_TARGET_LOCALES];

  for (const locale of locales) {
    if (!targetLocaleSet.has(locale)) {
      throw new Error(
        `Unsupported target locale "${locale}". Supported: ${[...targetLocaleSet].join(', ')}`,
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

function rowId(row: Pick<SpreadsheetRow, 'locale' | 'namespace' | 'key'>): string {
  return `${row.locale}/${row.namespace}.${row.key}`;
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
    const perLocale: ExportReport['perNamespace'][string]['perLocale'] = {};
    let emptyTranslations = 0;

    for (const locale of options.locales) {
      const localeJson = readLocaleNamespace(locale, namespaceFile);
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

export function writeSpreadsheet(
  sheets: Record<string, LocaleSheetRow[]>,
  outputPath: string,
  format: 'xlsx' | 'csv',
): void {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (format === 'csv') {
    const baseName = path.basename(outputPath, path.extname(outputPath));
    const dir = path.dirname(outputPath);

    for (const [locale, rows] of Object.entries(sheets)) {
      const csvPath = path.join(dir, `${baseName}.${locale}.csv`);
      const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: [...LOCALE_SHEET_HEADERS],
      });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, locale);
      XLSX.writeFile(workbook, csvPath, { bookType: 'csv' });
    }

    return;
  }

  const workbook = XLSX.utils.book_new();

  for (const [locale, rows] of Object.entries(sheets)) {
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [...LOCALE_SHEET_HEADERS],
    });
    XLSX.utils.book_append_sheet(workbook, worksheet, locale);
  }

  XLSX.writeFile(workbook, outputPath, { bookType: 'xlsx' });
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

export function readSpreadsheet(filePath: string): SpreadsheetRow[] {
  const knownNamespaces = resolveNamespaces();

  if (filePath.endsWith('.csv')) {
    const localeMatch = path.basename(filePath).match(/\.([a-z]{2})\.csv$/i);
    if (!localeMatch) {
      throw new Error(
        'CSV import expects one locale per file (e.g. handoff.de.csv). Import each file separately or use xlsx.',
      );
    }

    const locale = localeMatch[1].toLowerCase();
    if (!targetLocaleSet.has(locale)) {
      throw new Error(`Unsupported locale in filename: ${locale}`);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('CSV file has no data');
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[sheetName],
      { defval: '' },
    );

    return parseLocaleSheetRows(
      rawRows,
      locale,
      path.basename(filePath),
      knownNamespaces,
    );
  }

  const workbook = XLSX.readFile(filePath);
  if (workbook.SheetNames.length === 0) {
    throw new Error('Spreadsheet has no sheets');
  }

  const rows: SpreadsheetRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const locale = sheetName.trim().toLowerCase();
    if (!targetLocaleSet.has(locale)) {
      throw new Error(
        `Unknown sheet "${sheetName}". Expected a target locale code (${[...targetLocaleSet].join(', ')}).`,
      );
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[sheetName],
      { defval: '' },
    );

    rows.push(
      ...parseLocaleSheetRows(rawRows, locale, sheetName, knownNamespaces),
    );
  }

  return rows;
}

export function importTranslations(options: ImportOptions): ImportReport {
  const { namespaceFiles } = resolveLocaleLayout();
  const namespaceFilesByName = new Map(
    namespaceFiles.map((file) => [namespaceFromFile(file), file]),
  );

  const rows = readSpreadsheet(options.file);
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
      const file = namespaceFilesByName.get(namespace);
      if (!file) {
        throw new Error(`Unknown namespace "${namespace}"`);
      }
      enCache.set(namespace, readLocaleNamespace(DEFAULT_LOCALE, file));
    }
    return enCache.get(namespace)!;
  };

  const loadLocale = (locale: string, namespace: string): JsonObject => {
    const cacheKey = `${locale}:${namespace}`;
    if (!localeCache.has(cacheKey)) {
      const file = namespaceFilesByName.get(namespace);
      if (!file) {
        throw new Error(`Unknown namespace "${namespace}"`);
      }
      localeCache.set(cacheKey, readLocaleNamespace(locale, file));
    }
    return localeCache.get(cacheKey)!;
  };

  for (const row of rows) {
    const id = rowId(row);

    if (row.locale === DEFAULT_LOCALE) {
      report.skipped.english_locale.push(id);
      continue;
    }

    if (!targetLocaleSet.has(row.locale)) {
      report.skipped.invalid_locale.push(id);
      continue;
    }

    if (!namespaceFilesByName.has(row.namespace)) {
      report.skipped.unknown_namespace.push(id);
      continue;
    }

    const enJson = loadEn(row.namespace);
    const enValue = getStringAtPath(enJson, row.key);
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

    const localeJson = loadLocale(row.locale, row.namespace);
    setValueByPath(localeJson, row.key, row.translation);
    touchedFiles.add(`${row.locale}:${row.namespace}`);
    report.updated.push(id);
  }

  if (!options.dryRun) {
    const importedAt = report.importedAt;

    for (const touched of touchedFiles) {
      const [locale, namespace] = touched.split(':');
      const namespaceFile = namespaceFilesByName.get(namespace)!;
      const localeJson = loadLocale(locale, namespace);
      ensureMetaBlock(localeJson, locale, importedAt);
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
  console.log('\nImport summary');
  console.log(`  File: ${report.inputPath}`);
  console.log(`  Dry run: ${report.dryRun ? 'yes' : 'no'}`);
  console.log(`  Updated: ${report.updated.length}`);

  if (report.updated.length > 0) {
    report.updated.slice(0, 20).forEach((entry) => console.log(`    ${entry}`));
    if (report.updated.length > 20) {
      console.log(`    ... and ${report.updated.length - 20} more`);
    }
  }

  const skipLabels: Array<[keyof ImportReport['skipped'], string]> = [
    ['blank_cell', 'Skipped (blank cell)'],
    ['unknown_namespace', 'Skipped (unknown namespace)'],
    ['unknown_key', 'Skipped (unknown key)'],
    ['invalid_locale', 'Skipped (invalid locale)'],
    ['placeholder_mismatch', 'Skipped (placeholder mismatch)'],
    ['english_locale', 'Skipped (english locale)'],
  ];

  for (const [key, label] of skipLabels) {
    const items = report.skipped[key];
    console.log(`  ${label}: ${items.length}`);
    items.slice(0, 10).forEach((entry) => console.log(`    ${entry}`));
    if (items.length > 10) {
      console.log(`    ... and ${items.length - 10} more`);
    }
  }

  console.log(`  Still missing after import: ${report.stillMissing.length}`);
  report.stillMissing.slice(0, 20).forEach((entry) => console.log(`    ${entry}`));
  if (report.stillMissing.length > 20) {
    console.log(`    ... and ${report.stillMissing.length - 20} more`);
  }

  if (report.metaUpdated.length > 0) {
    console.log(`  meta.lastImportedAt updated:`);
    report.metaUpdated.forEach((entry) => console.log(`    ${entry}`));
  }
}
