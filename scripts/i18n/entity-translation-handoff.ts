import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
} from '../../src/i18n/constants';
import {
  ENTITY_TRANSLATABLE_FIELDS,
  isTranslatableEntityType,
  isValidFieldForEntity,
  type TranslatableEntityType,
} from '../../src/translations/entity-types';
import {
  type LocaleSheetRow,
  parseCsvList,
  resolveTargetLocales,
  runScript,
  writeReportFile,
  writeSpreadsheet,
} from './translation-handoff';

export const DEFAULT_ENTITY_HANDOFF_PATH = path.join(
  'translations',
  'entity-handoff.xlsx',
);

const ENTITY_SHEET_HEADERS = ['key', 'en', 'translation'] as const;

/** Default fields exported for GenericFood vendor handoff. */
export const DEFAULT_GENERIC_FOOD_EXPORT_FIELDS = [
  'foodName',
  'foodGroup',
] as const;

export type EntityTranslationKey = {
  entityType: TranslatableEntityType;
  naturalKey: string;
  field: string;
};

/**
 * Stable spreadsheet key: GenericFood.{nevoCode}.{field}
 * Example: GenericFood.1.foodName
 */
export function toEntityTranslationKey(
  entityType: TranslatableEntityType,
  naturalKey: string | number,
  field: string,
): string {
  return `${entityType}.${naturalKey}.${field}`;
}

export function parseEntityTranslationKey(
  fullKey: string,
): EntityTranslationKey | undefined {
  const trimmed = fullKey.trim();
  const parts = trimmed.split('.');
  if (parts.length < 3) {
    return undefined;
  }

  const entityType = parts[0];
  const field = parts[parts.length - 1];
  const naturalKey = parts.slice(1, -1).join('.');

  if (!isTranslatableEntityType(entityType)) {
    return undefined;
  }
  if (!isValidFieldForEntity(entityType, field)) {
    return undefined;
  }
  if (!naturalKey) {
    return undefined;
  }

  return { entityType, naturalKey, field };
}

export type EntityExportOptions = {
  out: string;
  format: 'xlsx' | 'csv';
  locales: string[];
  entityType: TranslatableEntityType;
  fields: string[];
};

export type EntityExportReport = {
  exportedAt: string;
  format: 'xlsx' | 'csv';
  outputPath: string;
  entityType: string;
  fields: string[];
  targetLocales: string[];
  foodsExported: number;
  totalRows: number;
  perLocale: Record<
    string,
    { exportedRows: number; emptyTranslations: number; sameAsEn: number }
  >;
};

export type EntityImportOptions = {
  file: string;
  dryRun: boolean;
};

type EntityImportSkipReason =
  | 'blank_cell'
  | 'invalid_key'
  | 'invalid_locale'
  | 'english_locale'
  | 'unknown_entity'
  | 'unsupported_entity_type';

export type EntityImportReport = {
  importedAt: string;
  inputPath: string;
  dryRun: boolean;
  upserted: number;
  skipped: Record<EntityImportSkipReason, string[]>;
};

function englishValueForField(
  food: { foodName: string; foodGroup: string; synonym: string | null },
  field: string,
): string {
  if (field === 'foodName') return food.foodName;
  if (field === 'foodGroup') return food.foodGroup;
  if (field === 'synonym') return food.synonym ?? '';
  if (field === 'remark') return '';
  return '';
}

export async function buildGenericFoodExportSheets(
  prisma: PrismaClient,
  options: EntityExportOptions,
): Promise<{ sheets: Record<string, LocaleSheetRow[]>; report: EntityExportReport }> {
  for (const field of options.fields) {
    if (!isValidFieldForEntity('GenericFood', field)) {
      throw new Error(
        `Field "${field}" is not translatable for GenericFood. Allowed: ${ENTITY_TRANSLATABLE_FIELDS.GenericFood.join(', ')}`,
      );
    }
  }

  const foods = await prisma.genericFood.findMany({
    select: {
      id: true,
      nevoCode: true,
      foodName: true,
      foodGroup: true,
      synonym: true,
    },
    orderBy: { nevoCode: 'asc' },
  });

  const existing = await prisma.entityTranslation.findMany({
    where: {
      entityType: 'GenericFood',
      locale: { in: options.locales },
      field: { in: options.fields },
      entityId: { in: foods.map((f) => f.id) },
    },
    select: {
      entityId: true,
      locale: true,
      field: true,
      value: true,
    },
  });

  const existingByKey = new Map<string, string>();
  for (const row of existing) {
    existingByKey.set(`${row.entityId}:${row.locale}:${row.field}`, row.value);
  }

  const sheets: Record<string, LocaleSheetRow[]> = {};
  const perLocale: EntityExportReport['perLocale'] = {};
  let totalRows = 0;

  for (const locale of options.locales) {
    sheets[locale] = [];
    let emptyTranslations = 0;
    let sameAsEn = 0;

    for (const food of foods) {
      for (const field of options.fields) {
        const en = englishValueForField(food, field);
        // Skip remark/synonym rows with no English and no existing translation
        // to keep vendor files focused (foodName/foodGroup always exported).
        const current =
          existingByKey.get(`${food.id}:${locale}:${field}`) ?? '';
        if (
          (field === 'remark' || field === 'synonym') &&
          !en &&
          !current
        ) {
          continue;
        }

        if (!current) {
          emptyTranslations += 1;
        } else if (current === en) {
          sameAsEn += 1;
        }

        sheets[locale].push({
          key: toEntityTranslationKey('GenericFood', food.nevoCode, field),
          en,
          translation: current,
        });
        totalRows += 1;
      }
    }

    sheets[locale].sort((a, b) => a.key.localeCompare(b.key));
    perLocale[locale] = {
      exportedRows: sheets[locale].length,
      emptyTranslations,
      sameAsEn,
    };
  }

  return {
    sheets,
    report: {
      exportedAt: new Date().toISOString(),
      format: options.format,
      outputPath: options.out,
      entityType: options.entityType,
      fields: options.fields,
      targetLocales: options.locales,
      foodsExported: foods.length,
      totalRows,
      perLocale,
    },
  };
}

async function readEntitySpreadsheet(
  filePath: string,
): Promise<{ locale: string; key: string; en: string; translation: string }[]> {
  const rows: {
    locale: string;
    key: string;
    en: string;
    translation: string;
  }[] = [];

  if (filePath.endsWith('.csv')) {
    const localeMatch = path.basename(filePath).match(/\.([a-z]{2})\.csv$/i);
    if (!localeMatch) {
      throw new Error(
        'CSV import expects one locale per file (e.g. entity-handoff.de.csv).',
      );
    }
    const locale = localeMatch[1].toLowerCase();
    const workbook = new ExcelJS.Workbook();
    const worksheet = await workbook.csv.readFile(filePath);
    rows.push(
      ...worksheetToEntityRows(worksheet, locale, path.basename(filePath)),
    );
    return rows;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  if (workbook.worksheets.length === 0) {
    throw new Error('Spreadsheet has no sheets');
  }

  for (const sheet of workbook.worksheets) {
    const locale = sheet.name.trim().toLowerCase();
    rows.push(...worksheetToEntityRows(sheet, locale, sheet.name));
  }
  return rows;
}

function worksheetToEntityRows(
  worksheet: ExcelJS.Worksheet,
  locale: string,
  sheetLabel: string,
): { locale: string; key: string; en: string; translation: string }[] {
  const headerRow = worksheet.getRow(1);
  const headerToCol = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const name = String(cell.value ?? '')
      .trim()
      .toLowerCase();
    if (name) {
      headerToCol.set(name, colNumber);
    }
  });

  for (const required of ENTITY_SHEET_HEADERS) {
    if (!headerToCol.has(required)) {
      throw new Error(
        `Sheet "${sheetLabel}" missing required column "${required}"`,
      );
    }
  }

  const keyCol = headerToCol.get('key')!;
  const enCol = headerToCol.get('en')!;
  const translationCol = headerToCol.get('translation')!;

  const out: {
    locale: string;
    key: string;
    en: string;
    translation: string;
  }[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const key = String(row.getCell(keyCol).value ?? '').trim();
    if (!key) return;
    out.push({
      locale,
      key,
      en: String(row.getCell(enCol).value ?? '').trim(),
      translation: String(row.getCell(translationCol).value ?? '').trim(),
    });
  });

  return out;
}

export async function importEntityTranslations(
  prisma: PrismaClient,
  options: EntityImportOptions,
): Promise<EntityImportReport> {
  const report: EntityImportReport = {
    importedAt: new Date().toISOString(),
    inputPath: options.file,
    dryRun: options.dryRun,
    upserted: 0,
    skipped: {
      blank_cell: [],
      invalid_key: [],
      invalid_locale: [],
      english_locale: [],
      unknown_entity: [],
      unsupported_entity_type: [],
    },
  };

  const spreadsheetRows = await readEntitySpreadsheet(options.file);
  const targetLocaleSet = new Set<string>(
    SUPPORTED_LOCALES.filter((l) => l !== DEFAULT_LOCALE),
  );

  // Resolve GenericFood nevoCodes in bulk
  const nevoCodesNeeded = new Set<number>();
  for (const row of spreadsheetRows) {
    const parsed = parseEntityTranslationKey(row.key);
    if (parsed?.entityType === 'GenericFood') {
      const code = Number(parsed.naturalKey);
      if (!Number.isNaN(code)) {
        nevoCodesNeeded.add(code);
      }
    }
  }

  const foods = await prisma.genericFood.findMany({
    where: { nevoCode: { in: [...nevoCodesNeeded] } },
    select: { id: true, nevoCode: true },
  });
  const idByNevoCode = new Map(foods.map((f) => [f.nevoCode, f.id]));

  for (const row of spreadsheetRows) {
    const rowId = `${row.locale}/${row.key}`;

    if (row.locale === DEFAULT_LOCALE) {
      report.skipped.english_locale.push(rowId);
      continue;
    }
    if (!targetLocaleSet.has(row.locale)) {
      report.skipped.invalid_locale.push(rowId);
      continue;
    }
    if (!row.translation) {
      report.skipped.blank_cell.push(rowId);
      continue;
    }

    const parsed = parseEntityTranslationKey(row.key);
    if (!parsed) {
      report.skipped.invalid_key.push(rowId);
      continue;
    }

    if (parsed.entityType !== 'GenericFood') {
      report.skipped.unsupported_entity_type.push(rowId);
      continue;
    }

    const nevoCode = Number(parsed.naturalKey);
    const entityId = idByNevoCode.get(nevoCode);
    if (!entityId) {
      report.skipped.unknown_entity.push(rowId);
      continue;
    }

    if (!options.dryRun) {
      await prisma.entityTranslation.upsert({
        where: {
          entityType_entityId_locale_field: {
            entityType: 'GenericFood',
            entityId,
            locale: row.locale,
            field: parsed.field,
          },
        },
        create: {
          entityType: 'GenericFood',
          entityId,
          locale: row.locale,
          field: parsed.field,
          value: row.translation,
        },
        update: { value: row.translation },
      });
    }
    report.upserted += 1;
  }

  return report;
}

export function printEntityExportReport(report: EntityExportReport): void {
  console.log(`\nEntity translation export`);
  console.log(`  entityType: ${report.entityType}`);
  console.log(`  fields: ${report.fields.join(', ')}`);
  console.log(`  foods: ${report.foodsExported}`);
  console.log(`  locales: ${report.targetLocales.join(', ')}`);
  console.log(`  total rows: ${report.totalRows}`);
  console.log(`  output: ${report.outputPath}`);
  for (const [locale, stats] of Object.entries(report.perLocale)) {
    console.log(
      `  ${locale}: ${stats.exportedRows} rows (${stats.emptyTranslations} empty, ${stats.sameAsEn} same-as-en)`,
    );
  }
}

export function printEntityImportReport(report: EntityImportReport): void {
  console.log(`\nEntity translation import${report.dryRun ? ' (dry-run)' : ''}`);
  console.log(`  upserted: ${report.upserted}`);
  for (const [reason, ids] of Object.entries(report.skipped)) {
    if (ids.length > 0) {
      console.log(`  skipped.${reason}: ${ids.length}`);
    }
  }
}

export {
  parseCsvList,
  resolveTargetLocales,
  runScript,
  writeReportFile,
  writeSpreadsheet,
};
