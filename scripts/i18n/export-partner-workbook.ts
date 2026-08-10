#!/usr/bin/env ts-node

/**
 * Exports every translatable string into one .xlsx for the partners.
 *
 *   npm run i18n:workbook:export
 *   npm run i18n:workbook:export -- --out translations/round-2.xlsx
 *   npm run i18n:workbook:export -- --locales de,nl --sheets ui-catalog,food-names
 *   npm run i18n:workbook:export -- --missing-only
 *
 * Reads the repository files only — no database access.
 */

import { parseArgs } from 'node:util';
import {
  DEFAULT_WORKBOOK_PATH,
  parseCsvList,
  resolveCategories,
  resolveLocales,
  runScript,
  writeReportFile,
} from './partner-workbook';
import { writeWorkbook, type SheetData } from './partner-workbook-xlsx';

type ExportReport = {
  exportedAt: string;
  outputPath: string;
  locales: string[];
  missingOnly: boolean;
  totalRows: number;
  perSheet: Record<
    string,
    {
      rows: number;
      source: string;
      seededBy: string;
      missingPerLocale: Record<string, number>;
    }
  >;
};

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      out: { type: 'string', default: DEFAULT_WORKBOOK_PATH },
      locales: { type: 'string' },
      sheets: { type: 'string' },
      'missing-only': { type: 'boolean', default: false },
    },
  });

  const out = values.out ?? DEFAULT_WORKBOOK_PATH;
  const locales = resolveLocales(parseCsvList(values.locales));
  const categories = resolveCategories(parseCsvList(values.sheets));
  const missingOnly = values['missing-only'] ?? false;

  const report: ExportReport = {
    exportedAt: new Date().toISOString(),
    outputPath: out,
    locales,
    missingOnly,
    totalRows: 0,
    perSheet: {},
  };

  const sheets: SheetData[] = [];

  for (const category of categories) {
    const all = category.collect(locales);
    const entries = missingOnly
      ? all.filter((entry) =>
          locales.some((locale) => !entry.translations[locale]?.trim()),
        )
      : all;

    sheets.push({ category, entries });
    report.totalRows += entries.length;
    report.perSheet[category.id] = {
      rows: entries.length,
      source: category.source,
      seededBy: category.seededBy,
      missingPerLocale: Object.fromEntries(
        locales.map((locale) => [
          locale,
          entries.filter((entry) => !entry.translations[locale]?.trim()).length,
        ]),
      ),
    };
  }

  await writeWorkbook(sheets, locales, out);

  const reportPath = `${out}.report.json`;
  writeReportFile(reportPath, report);

  console.log(`\n📦 Translation workbook`);
  console.log(`   locales: ${locales.join(', ')}`);
  console.log(
    `   rows: ${report.totalRows}${missingOnly ? ' (missing only)' : ''}`,
  );
  for (const [id, stats] of Object.entries(report.perSheet)) {
    const missing = Object.entries(stats.missingPerLocale)
      .filter(([, count]) => count > 0)
      .map(([locale, count]) => `${locale}:${count}`)
      .join(' ');
    console.log(
      `   ${id}: ${stats.rows} rows${missing ? ` — missing ${missing}` : ' — complete'}`,
    );
  }
  console.log(`\n✅ Written to ${out}`);
  console.log(`   Report: ${reportPath}`);
}

runScript(main);
