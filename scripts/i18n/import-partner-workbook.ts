#!/usr/bin/env ts-node

/**
 * Imports a partner-edited translation workbook back into the source files.
 *
 *   npm run i18n:workbook:import -- --dry-run
 *   npm run i18n:workbook:import
 *   npm run i18n:workbook:import -- --file translations/round-2.xlsx --locales de
 *   npm run i18n:workbook:import -- --accept-english
 *
 * Writes to:
 *   src/i18n/<locale>/*.json                              (ui-* sheets)
 *   prisma/seeds/data/surveys/translations/<locale>.json  (survey-* sheets)
 *   prisma/seeds/data/nevo/nevo_translations.csv          (food-* sheets)
 *
 * English is owned by the repository: edited `en` cells are only reported,
 * unless `--accept-english` is passed. Then they are written to the English
 * source (src/i18n/en/*.json, prisma/seeds/data/catalog/*.en.json) for the
 * sheets that support it, and translations left untouched on those rows are
 * listed as `staleTranslations` in the report.
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
  type EnglishUpdate,
  type LocaleUpdate,
} from './partner-workbook';
import { readWorkbook } from './partner-workbook-xlsx';

type SkipReason =
  | 'unknown_sheet'
  | 'unknown_key'
  | 'blank_cell'
  | 'unchanged'
  | 'placeholder_mismatch'
  | 'english_changed'
  | 'english_unsupported'
  | 'english_placeholder_mismatch';

type ImportReport = {
  importedAt: string;
  inputPath: string;
  dryRun: boolean;
  locales: string[];
  updated: number;
  updatedPerLocale: Record<string, number>;
  touchedFiles: string[];
  perSheet: Record<string, { updated: number; englishUpdated: number }>;
  skipped: Record<SkipReason, string[]>;
  /** Rows whose English text was written back (`--accept-english`). */
  englishUpdated: string[];
  /** Existing translations kept on rows whose English text changed. */
  staleTranslations: string[];
};

const SKIP_REASONS: SkipReason[] = [
  'unknown_sheet',
  'unknown_key',
  'blank_cell',
  'unchanged',
  'placeholder_mismatch',
  'english_changed',
  'english_unsupported',
  'english_placeholder_mismatch',
];

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: 'string', default: DEFAULT_WORKBOOK_PATH },
      locales: { type: 'string' },
      sheets: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      'accept-english': { type: 'boolean', default: false },
    },
  });

  const file = values.file ?? DEFAULT_WORKBOOK_PATH;
  const dryRun = values['dry-run'] ?? false;
  const acceptEnglish = values['accept-english'] ?? false;
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
    englishUpdated: [],
    staleTranslations: [],
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
    const englishUpdates: EnglishUpdate[] = [];

    for (const row of sheet.rows) {
      const entry = current.get(row.key);
      if (!entry) {
        report.skipped.unknown_key.push(`${sheet.name}!row${row.rowNumber}`);
        continue;
      }

      // English is owned by the repository — a changed cell means either the
      // source moved on since the export, or the partner edited it. Only
      // written back when explicitly accepted.
      let en = entry.en;
      let englishAccepted = false;
      if (row.en && row.en !== entry.en.trim()) {
        const englishRowId = `${sheet.name}/${row.key}`;
        if (!acceptEnglish) {
          report.skipped.english_changed.push(englishRowId);
        } else if (!category.applyEnglish) {
          report.skipped.english_unsupported.push(englishRowId);
        } else if (
          category.checkPlaceholders &&
          !checkPlaceholders(entry.en, row.en)
        ) {
          report.skipped.english_placeholder_mismatch.push(englishRowId);
        } else {
          englishUpdates.push({ key: row.key, value: row.en });
          report.englishUpdated.push(englishRowId);
          en = row.en;
          englishAccepted = true;
        }
      }

      for (const locale of sheet.locales) {
        const value = row.translations[locale] ?? '';
        const rowId = `${locale}/${sheet.name}/${row.key}`;
        const currentValue = entry.translations[locale] ?? '';

        if (
          englishAccepted &&
          currentValue &&
          (!value || value === currentValue)
        ) {
          report.staleTranslations.push(rowId);
        }

        if (!value) {
          report.skipped.blank_cell.push(rowId);
          continue;
        }
        if (value === currentValue) {
          report.skipped.unchanged.push(rowId);
          continue;
        }
        if (category.checkPlaceholders && !checkPlaceholders(en, value)) {
          report.skipped.placeholder_mismatch.push(rowId);
          continue;
        }

        updates.push({ key: row.key, locale, value });
      }
    }

    const touched = category.apply(updates, dryRun, {
      locales: sheet.locales,
      validKeys: new Set(current.keys()),
    });
    report.touchedFiles.push(...touched);
    if (englishUpdates.length > 0) {
      report.touchedFiles.push(
        ...category.applyEnglish!(englishUpdates, dryRun),
      );
    }
    report.perSheet[sheet.name] = {
      updated: updates.length,
      englishUpdated: englishUpdates.length,
    };
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
  if (acceptEnglish) {
    console.log(`   updated english: ${report.englishUpdated.length}`);
  }
  for (const [sheetName, stats] of Object.entries(report.perSheet)) {
    if (stats.updated > 0 || stats.englishUpdated > 0) {
      const english =
        stats.englishUpdated > 0 ? ` (+${stats.englishUpdated} en)` : '';
      console.log(`   ${sheetName}: ${stats.updated}${english}`);
    }
  }
  for (const reason of SKIP_REASONS) {
    const count = report.skipped[reason].length;
    if (count > 0 && reason !== 'unchanged' && reason !== 'blank_cell') {
      console.log(`   skipped.${reason}: ${count}`);
    }
  }
  if (report.staleTranslations.length > 0) {
    console.log(
      `   stale translations (English changed, translation kept): ${report.staleTranslations.length}`,
    );
  }
  if (!acceptEnglish && report.skipped.english_changed.length > 0) {
    console.log(
      '   ↳ re-run with --accept-english to write the edited English text back',
    );
  }
  if (report.touchedFiles.length > 0) {
    console.log(`\n   ${dryRun ? 'Would write' : 'Wrote'}:`);
    for (const touched of report.touchedFiles) {
      console.log(`     ${touched}`);
    }
  }
  console.log(`\n   Report: ${reportPath}`);
  if (!dryRun && (report.updated > 0 || report.englishUpdated.length > 0)) {
    console.log(
      '\n👉 Commit the changed files, then run `npm run db:translations` on deploy.',
    );
  }

  if (
    report.skipped.placeholder_mismatch.length > 0 ||
    report.skipped.english_placeholder_mismatch.length > 0 ||
    report.skipped.unknown_key.length > 0 ||
    report.skipped.unknown_sheet.length > 0
  ) {
    process.exit(1);
  }
}

runScript(main);
