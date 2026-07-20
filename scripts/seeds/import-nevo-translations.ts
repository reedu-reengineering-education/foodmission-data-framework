#!/usr/bin/env ts-node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { parseArgs } from 'node:util';

export const DEFAULT_NEVO_TRANSLATIONS_CSV = path.join(
  process.cwd(),
  'prisma',
  'seeds',
  'data',
  'nevo',
  'nevo_translations.csv',
);

/** Non-English locales imported into entity_translations. English stays on GenericFood from NEVO seed. */
const LOCALES = ['nl', 'no', 'de', 'es', 'el', 'it', 'pl', 'sl'] as const;
type Locale = (typeof LOCALES)[number];
type Field = 'foodName' | 'foodGroup' | 'remark' | 'synonym';

export const LOCALE_COLUMNS: Record<
  Locale,
  Partial<Record<Field, string>>
> = {
  nl: {
    foodName: 'food_name_nl',
    foodGroup: 'food_group_nl',
    remark: 'remark_nl',
    synonym: 'synonym_nl',
  },
  no: { foodName: 'food_name_no', foodGroup: 'food_group_no' },
  de: { foodName: 'food_name_de', foodGroup: 'food_group_de' },
  es: { foodName: 'food_name_es', foodGroup: 'food_group_es' },
  el: { foodName: 'food_name_el', foodGroup: 'food_group_el' },
  it: { foodName: 'food_name_it', foodGroup: 'food_group_it' },
  pl: { foodName: 'food_name_pl', foodGroup: 'food_group_pl' },
  sl: { foodName: 'food_name_sl', foodGroup: 'food_group_sl' },
};

type CsvRecord = Record<string, string>;

export type TranslationUpsertRow = {
  entityType: 'GenericFood';
  entityId: string;
  locale: Locale;
  field: Field;
  value: string;
};

export type ParsedRow = {
  nevoCode: number;
  translations: Record<Locale, Partial<Record<Field, string>>>;
};

export type ImportReport = {
  importedAt: string;
  csvPath: string;
  dryRun: boolean;
  foodsInCsv: number;
  upsertedTranslations: number;
  skippedBlank: number;
  skippedUnknownNevoCode: number;
  unknownNevoCodes: number[];
};

/** Parse RFC 4180-style CSV (quoted fields, commas inside quotes). */
export function parseCsvRecords(content: string): CsvRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || (char === '\r' && next === '\n')) {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      if (char === '\r') {
        i += 1;
      }
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const record: CsvRecord = {};
    headers.forEach((header, idx) => {
      record[header] = (cells[idx] ?? '').trim();
    });
    return record;
  });
}

export function parseNevoTranslationsCsv(content: string): ParsedRow[] {
  const records = parseCsvRecords(content);
  const rows: ParsedRow[] = [];

  for (const record of records) {
    const nevoCodeRaw =
      record['NEVO-code'] ?? record['NEVO_code'] ?? record.nevoCode ?? '';
    const nevoCode = Number.parseInt(nevoCodeRaw, 10);
    if (Number.isNaN(nevoCode)) continue;

    const translations = Object.fromEntries(
      LOCALES.map((locale) => {
        const cols = LOCALE_COLUMNS[locale];
        const localized = Object.fromEntries(
          (Object.entries(cols) as [Field, string][]).map(([field, column]) => [
            field,
            (record[column] ?? '').trim(),
          ]),
        );
        return [locale, localized];
      }),
    ) as ParsedRow['translations'];

    rows.push({ nevoCode, translations });
  }

  return rows;
}

export function buildTranslationRows(
  parsedRows: ParsedRow[],
  idByNevoCode: Map<number, string>,
): {
  translationRows: TranslationUpsertRow[];
  skippedBlank: number;
  skippedUnknownNevoCode: number;
  unknownNevoCodes: number[];
} {
  const translationRows: TranslationUpsertRow[] = [];
  let skippedBlank = 0;
  let skippedUnknownNevoCode = 0;
  const unknownNevoCodes: number[] = [];

  for (const row of parsedRows) {
    const genericFoodId = idByNevoCode.get(row.nevoCode);
    if (!genericFoodId) {
      skippedUnknownNevoCode += 1;
      unknownNevoCodes.push(row.nevoCode);
      continue;
    }

    for (const locale of LOCALES) {
      const columns = LOCALE_COLUMNS[locale];
      const localized = row.translations[locale];
      for (const field of Object.keys(columns) as Field[]) {
        const value = (localized[field] ?? '').trim();
        if (!value) {
          skippedBlank += 1;
          continue;
        }
        translationRows.push({
          entityType: 'GenericFood',
          entityId: genericFoodId,
          locale,
          field,
          value,
        });
      }
    }
  }

  return {
    translationRows,
    skippedBlank,
    skippedUnknownNevoCode,
    unknownNevoCodes,
  };
}

async function upsertTranslationBatch(
  prisma: PrismaClient,
  batch: TranslationUpsertRow[],
): Promise<void> {
  await prisma.$transaction(
    batch.map((row) =>
      prisma.entityTranslation.upsert({
        where: {
          entityType_entityId_locale_field: {
            entityType: row.entityType,
            entityId: row.entityId,
            locale: row.locale,
            field: row.field,
          },
        },
        create: row,
        update: { value: row.value },
      }),
    ),
  );
}

export async function importNevoCsv(
  prisma: PrismaClient,
  options: { file: string; dryRun: boolean; batchSize: number },
): Promise<ImportReport> {
  const content = fs.readFileSync(options.file, 'utf-8');
  const parsedRows = parseNevoTranslationsCsv(content);
  const foods = await prisma.genericFood.findMany({
    select: { id: true, nevoCode: true },
  });
  const idByNevoCode = new Map<number, string>(
    foods.map((f) => [f.nevoCode, f.id]),
  );

  const ops = buildTranslationRows(parsedRows, idByNevoCode);

  if (!options.dryRun) {
    for (let i = 0; i < ops.translationRows.length; i += options.batchSize) {
      await upsertTranslationBatch(
        prisma,
        ops.translationRows.slice(i, i + options.batchSize),
      );
    }
  }

  return {
    importedAt: new Date().toISOString(),
    csvPath: options.file,
    dryRun: options.dryRun,
    foodsInCsv: parsedRows.length,
    upsertedTranslations: ops.translationRows.length,
    skippedBlank: ops.skippedBlank,
    skippedUnknownNevoCode: ops.skippedUnknownNevoCode,
    unknownNevoCodes: ops.unknownNevoCodes,
  };
}

export function printImportReport(report: ImportReport): void {
  console.log(`\nNEVO translations import${report.dryRun ? ' (dry-run)' : ''}`);
  console.log(`  csv: ${report.csvPath}`);
  console.log(`  foods in csv: ${report.foodsInCsv}`);
  console.log(`  translations upserted: ${report.upsertedTranslations}`);
  console.log(`  skipped blank cells: ${report.skippedBlank}`);
  console.log(`  skipped unknown nevoCode: ${report.skippedUnknownNevoCode}`);
  if (report.unknownNevoCodes.length > 0) {
    const preview = report.unknownNevoCodes.slice(0, 10).join(', ');
    const suffix =
      report.unknownNevoCodes.length > 10
        ? ` ... (+${report.unknownNevoCodes.length - 10} more)`
        : '';
    console.log(`  unknown nevoCodes: ${preview}${suffix}`);
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: 'string', default: DEFAULT_NEVO_TRANSLATIONS_CSV },
      'dry-run': { type: 'boolean', default: false },
      'batch-size': { type: 'string', default: '500' },
    },
  });

  const batchSize = Number.parseInt(values['batch-size'] ?? '500', 10);
  if (Number.isNaN(batchSize) || batchSize < 1) {
    throw new Error('--batch-size must be a positive integer');
  }

  const prisma = new PrismaClient();
  try {
    const report = await importNevoCsv(prisma, {
      file: values.file ?? DEFAULT_NEVO_TRANSLATIONS_CSV,
      dryRun: values['dry-run'] ?? false,
      batchSize,
    });
    printImportReport(report);
    if (report.skippedUnknownNevoCode > 0) process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(
      `❌ ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
}
