import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../../src/i18n/constants';

/**
 * Loads FoodEx2 concept-name translations into `entity_translations`.
 *
 * The MTX catalogue is English-only, so the user-facing FoodEx2 names are
 * translated separately and kept in a reviewable CSV rather than being written
 * straight to the database. Re-running upserts, so the step is idempotent and
 * a corrected CSV simply overwrites the previous values.
 *
 * Columns: code,en,<locale>… — the same shape the partner workbook uses.
 */

export const FOODEX2_TRANSLATIONS_CSV = path.join(
  process.cwd(),
  'prisma',
  'seeds',
  'data',
  'foodex2',
  'foodex2-translations.csv',
);

const TRANSLATABLE_LOCALES = SUPPORTED_LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE,
);

export interface Foodex2TranslationReport {
  csvPath: string;
  rows: number;
  upserted: number;
  unknownCodes: string[];
  blankCells: number;
  perLocale: Record<string, number>;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export function parseFoodex2TranslationsCsv(content: string): {
  header: string[];
  rows: Record<string, string>[];
} {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
  const header = parseCsvLine(lines.shift() ?? '').map((h) => h.trim());

  if (header[0] !== 'code') {
    throw new Error('FoodEx2 translations CSV must start with a "code" column');
  }

  const rows = lines.map((line) => {
    const fields = parseCsvLine(line);
    return Object.fromEntries(
      header.map((column, index) => [column, (fields[index] ?? '').trim()]),
    );
  });

  return { header, rows };
}

export async function seedFoodex2Translations(
  prisma: PrismaClient,
  csvPath: string = FOODEX2_TRANSLATIONS_CSV,
): Promise<Foodex2TranslationReport> {
  const report: Foodex2TranslationReport = {
    csvPath,
    rows: 0,
    upserted: 0,
    unknownCodes: [],
    blankCells: 0,
    perLocale: Object.fromEntries(
      TRANSLATABLE_LOCALES.map((locale) => [locale, 0]),
    ),
  };

  if (!fs.existsSync(csvPath)) {
    console.warn(
      `No FoodEx2 translations CSV at ${csvPath}; skipping FoodEx2 name translations.`,
    );
    return report;
  }

  const { header, rows } = parseFoodex2TranslationsCsv(
    fs.readFileSync(csvPath, 'utf-8'),
  );
  report.rows = rows.length;

  const locales = TRANSLATABLE_LOCALES.filter((locale) =>
    header.includes(locale),
  );

  const terms = await prisma.foodex2Term.findMany({
    where: { code: { in: rows.map((row) => row.code) } },
    select: { id: true, code: true },
  });
  const idByCode = new Map(terms.map((term) => [term.code, term.id]));

  for (const row of rows) {
    const entityId = idByCode.get(row.code);
    if (!entityId) {
      // A code that is no longer in the catalogue must be reported, not
      // silently dropped — it usually means the CSV predates an MTX upgrade.
      report.unknownCodes.push(row.code);
      continue;
    }

    for (const locale of locales) {
      const value = row[locale];
      if (!value) {
        report.blankCells += 1;
        continue;
      }

      await prisma.entityTranslation.upsert({
        where: {
          entityType_entityId_locale_field: {
            entityType: 'Foodex2Term',
            entityId,
            locale,
            field: 'name',
          },
        },
        create: {
          entityType: 'Foodex2Term',
          entityId,
          locale,
          field: 'name',
          value,
        },
        update: { value },
      });

      report.perLocale[locale] += 1;
      report.upserted += 1;
    }
  }

  return report;
}

export function printFoodex2TranslationReport(
  report: Foodex2TranslationReport,
): void {
  console.log('\n🥫 FoodEx2 name translations');
  console.log(`   rows: ${report.rows}`);
  console.log(`   upserted: ${report.upserted}`);
  console.log(
    `   per locale: ${Object.entries(report.perLocale)
      .map(([locale, count]) => `${locale}=${count}`)
      .join(' ')}`,
  );
  if (report.blankCells > 0) {
    console.log(`   blank cells skipped: ${report.blankCells}`);
  }
  if (report.unknownCodes.length > 0) {
    console.log(
      `   ⚠️  unknown FoodEx2 codes: ${report.unknownCodes.length} (${report.unknownCodes.slice(0, 10).join(', ')})`,
    );
  }
}
