#!/usr/bin/env ts-node

/**
 * Imports a partner-edited translation workbook back into the source files.
 *
 *   npm run i18n:workbook:import -- --dry-run
 *   npm run i18n:workbook:import
 *   npm run i18n:workbook:import -- --file translations/round-2.xlsx --locales de
 *
 * Writes to:
 *   src/i18n/<locale>/*.json                              (ui-* sheets)
 *   prisma/seeds/data/surveys/translations/<locale>.json  (survey-* sheets)
 *   prisma/seeds/data/nevo/nevo_translations.csv          (food-* sheets)
 *
 * Commit the changed files; the next deployment seeds the DB categories with
 * `npm run db:translations`.
 */

import { parseArgs } from 'node:util';
import {
  DEFAULT_WORKBOOK_PATH,
  checkPlaceholders,
  parseCsvList,
  resolveCategories,
  resolveLocales,
  runScript,
  writeReportFile,
  type LocaleUpdate,
} from './partner-workbook';
import { readWorkbook } from './partner-workbook-xlsx';

type SkipReason =
  | 'unknown_sheet'
  | 'unknown_key'
  | 'blank_cell'
  | 'unchanged'
  | 'placeholder_mismatch'
  | 'english_changed';

type ImportReport = {
  importedAt: string;
  inputPath: string;
  dryRun: boolean;
  locales: string[];
  updated: number;
  updatedPerLocale: Record<string, number>;
  touchedFiles: string[];
  perSheet: Record<string, { updated: number }>;
  skipped: Record<SkipReason, string[]>;
};

const SKIP_REASONS: SkipReason[] = [
  'unknown_sheet',
  'unknown_key',
  'blank_cell',
  'unchanged',
  'placeholder_mismatch',
  'english_changed',
];

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: 'string', default: DEFAULT_WORKBOOK_PATH },
      locales: { type: 'string' },
      sheets: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  const file = values.file ?? DEFAULT_WORKBOOK_PATH;
  const dryRun = values['dry-run'] ?? false;
  const locales = resolveLocales(parseCsvList(values.locales));
  const categories = resolveCategories(parseCsvList(values.sheets));
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );

  const report: ImportReport = {
    importedAt: new Date().toISOString(),
    inputPath: file,
    dryRun,
    locales,
    updated: 0,
    updatedPerLocale: Object.fromEntries(locales.map((locale) => [locale, 0])),
    touchedFiles: [],
    perSheet: {},
    skipped: Object.fromEntries(
      SKIP_REASONS.map((reason) => [reason, [] as string[]]),
    ) as Record<SkipReason, string[]>,
  };

  const sheets = await readWorkbook(file, locales);

  for (const sheet of sheets) {
    const category = categoryById.get(sheet.name);
    if (!category) {
      report.skipped.unknown_sheet.push(sheet.name);
      continue;
    }

    const current = new Map(
      category.collect(locales).map((entry) => [entry.key, entry]),
    );
    const updates: LocaleUpdate[] = [];

    for (const row of sheet.rows) {
      const entry = current.get(row.key);
      if (!entry) {
        report.skipped.unknown_key.push(`${sheet.name}!row${row.rowNumber}`);
        continue;
      }

      // English is owned by the repository — a changed cell means the source
      // moved on since the export, so the translations may be stale.
      if (row.en && row.en !== entry.en.trim()) {
        report.skipped.english_changed.push(`${sheet.name}/${row.key}`);
      }

      for (const locale of sheet.locales) {
        const value = row.translations[locale] ?? '';
        const rowId = `${locale}/${sheet.name}/${row.key}`;

        if (!value) {
          report.skipped.blank_cell.push(rowId);
          continue;
        }
        if (value === (entry.translations[locale] ?? '')) {
          report.skipped.unchanged.push(rowId);
          continue;
        }
        if (category.checkPlaceholders && !checkPlaceholders(entry.en, value)) {
          report.skipped.placeholder_mismatch.push(rowId);
          continue;
        }

        updates.push({ key: row.key, locale, value });
      }
    }

    const touched = category.apply(updates, dryRun);
    report.touchedFiles.push(...touched);
    report.perSheet[sheet.name] = { updated: updates.length };
    report.updated += updates.length;
    for (const update of updates) {
      report.updatedPerLocale[update.locale] += 1;
    }
  }

  report.touchedFiles = [...new Set(report.touchedFiles)].sort();

  const reportPath = `${file}.import-report.json`;
  writeReportFile(reportPath, report);

  console.log(`\n📥 Translation workbook import${dryRun ? ' (dry-run)' : ''}`);
  console.log(`   file: ${file}`);
  console.log(`   updated cells: ${report.updated}`);
  for (const [sheetName, stats] of Object.entries(report.perSheet)) {
    if (stats.updated > 0) {
      console.log(`   ${sheetName}: ${stats.updated}`);
    }
  }
  for (const reason of SKIP_REASONS) {
    const count = report.skipped[reason].length;
    if (count > 0 && reason !== 'unchanged' && reason !== 'blank_cell') {
      console.log(`   skipped.${reason}: ${count}`);
    }
  }
  if (report.touchedFiles.length > 0) {
    console.log(`\n   ${dryRun ? 'Would write' : 'Wrote'}:`);
    for (const touched of report.touchedFiles) {
      console.log(`     ${touched}`);
    }
  }
  console.log(`\n   Report: ${reportPath}`);
  if (!dryRun && report.updated > 0) {
    console.log(
      '\n👉 Commit the changed files, then run `npm run db:translations` on deploy.',
    );
  }

  if (
    report.skipped.placeholder_mismatch.length > 0 ||
    report.skipped.unknown_key.length > 0 ||
    report.skipped.unknown_sheet.length > 0
  ) {
    process.exit(1);
  }
}

runScript(main);
