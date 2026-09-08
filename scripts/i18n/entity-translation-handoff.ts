import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../src/i18n/constants';
import {
  ENTITY_TRANSLATABLE_FIELDS,
  isTranslatableEntityType,
  isValidFieldForEntity,
  type TranslatableEntityType,
} from '../../src/translations/entity-types';
import {
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

/** Learning / Task 3.3 entities included in DB handoff by default. */
export const LEARNING_ENTITY_TYPES = [
  'Dimension',
  'Topic',
  'FoodFact',
  'Quiz',
  'QuizOption',
  'Mission',
  'Challenge',
  'Quest',
  'MicroLearning',
] as const satisfies readonly TranslatableEntityType[];

/** Default entity set for `i18n:export:db`. */
/**
 * Default entity set for `i18n:export:db`.
 *
 * `Foodex2Term` is deliberately absent: FoodEx2 concept names are translated
 * through the master partner workbook (`food-foodex2` sheet) and live in
 * `prisma/seeds/data/foodex2/foodex2-translations.csv`. Exporting them here as
 * well would give two write paths to the same `entity_translations` rows, and
 * whichever ran last would silently win.
 */
export const DEFAULT_DB_HANDOFF_ENTITY_TYPES = [
  'GenericFood',
  ...LEARNING_ENTITY_TYPES,
] as const satisfies readonly TranslatableEntityType[];

export type EntityTranslationKey = {
  entityType: TranslatableEntityType;
  naturalKey: string;
  field: string;
};

/**
 * Stable spreadsheet key: `{EntityType}.{naturalKey}.{field}`
 * Examples:
 *   GenericFood.1.foodName
 *   FoodFact.FF1.1.1.body
 *   Mission.M.A1.1.title
 *   QuizOption.Q1.1.1:A.text
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
  /** Entity types to include. Defaults to GenericFood + learning catalog. */
  entityTypes?: readonly TranslatableEntityType[];
  /** GenericFood fields to export (ignored for other entity types). */
  genericFoodFields?: string[];
  /** @deprecated Use entityTypes + genericFoodFields. Kept for older callers. */
  entityType?: TranslatableEntityType;
  /** @deprecated Use genericFoodFields. */
  fields?: string[];
};

export type EntityExportReport = {
  exportedAt: string;
  format: 'xlsx' | 'csv';
  outputPath: string;
  entityTypes: string[];
  /** @deprecated Prefer entityTypes / entitiesExported. */
  entityType: string;
  fields: string[];
  targetLocales: string[];
  /** @deprecated Prefer entitiesExported.GenericFood. */
  foodsExported: number;
  entitiesExported: Record<string, number>;
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

type ExportableRow = {
  entityType: TranslatableEntityType;
  entityId: string;
  naturalKey: string;
  field: string;
  en: string;
};

type IdResolver = (naturalKey: string) => string | undefined;

function englishValueForFoodField(
  food: { foodName: string; foodGroup: string; synonym: string | null },
  field: string,
): string {
  if (field === 'foodName') return food.foodName;
  if (field === 'foodGroup') return food.foodGroup;
  if (field === 'synonym') return food.synonym ?? '';
  if (field === 'remark') return '';
  return '';
}

/** One workbook row: a key with its English source and every locale column. */
export type EntityWorkbookRow = {
  key: string;
  en: string;
  /** locale -> current translation ('' when missing). */
  translations: Record<string, string>;
};

/** One sheet per entity type, mirroring the partner translation workbook. */
export type EntitySheet = {
  name: string;
  rows: EntityWorkbookRow[];
};

async function loadExistingTranslations(
  prisma: PrismaClient,
  entityType: TranslatableEntityType,
  entityIds: string[],
  locales: string[],
  fields: string[],
): Promise<Map<string, string>> {
  if (entityIds.length === 0) {
    return new Map();
  }

  const existing = await prisma.entityTranslation.findMany({
    where: {
      entityType,
      locale: { in: locales },
      field: { in: fields },
      entityId: { in: entityIds },
    },
    select: {
      entityId: true,
      locale: true,
      field: true,
      value: true,
    },
  });

  const map = new Map<string, string>();
  for (const row of existing) {
    map.set(`${row.entityId}:${row.locale}:${row.field}`, row.value);
  }
  return map;
}

/**
 * Turns one entity's exportable rows into workbook rows.
 *
 * A row carries every locale as its own column, so a translator sees all
 * languages for a key side by side instead of one sheet per language.
 */
function pushBatch(args: {
  sheet: EntityWorkbookRow[];
  locales: string[];
  perLocale: EntityExportReport['perLocale'];
  rows: ExportableRow[];
  existingByKey: Map<string, string>;
  skipEmptyEnglishWithoutTranslation?: boolean;
}): number {
  const {
    sheet,
    locales,
    perLocale,
    rows,
    existingByKey,
    skipEmptyEnglishWithoutTranslation = false,
  } = args;

  let added = 0;
  for (const row of rows) {
    const translations: Record<string, string> = {};
    let keep = false;

    for (const locale of locales) {
      const current =
        existingByKey.get(`${row.entityId}:${locale}:${row.field}`) ?? '';
      translations[locale] = current;
      if (!skipEmptyEnglishWithoutTranslation || row.en || current) {
        keep = true;
      }
    }
    if (!keep) {
      continue;
    }

    for (const locale of locales) {
      const current = translations[locale];
      if (!current) {
        perLocale[locale].emptyTranslations += 1;
      } else if (current === row.en) {
        perLocale[locale].sameAsEn += 1;
      }
      perLocale[locale].exportedRows += 1;
    }

    sheet.push({
      key: toEntityTranslationKey(row.entityType, row.naturalKey, row.field),
      en: row.en,
      translations,
    });
    added += 1;
  }
  return added;
}

/** @deprecated Prefer buildEntityExportSheets. */
export async function buildGenericFoodExportSheets(
  prisma: PrismaClient,
  options: EntityExportOptions,
): Promise<{ sheets: EntitySheet[]; report: EntityExportReport }> {
  return buildEntityExportSheets(prisma, {
    ...options,
    entityTypes: ['GenericFood'],
    genericFoodFields: options.genericFoodFields ??
      options.fields ?? [...DEFAULT_GENERIC_FOOD_EXPORT_FIELDS],
  });
}

export async function buildEntityExportSheets(
  prisma: PrismaClient,
  options: EntityExportOptions,
): Promise<{ sheets: EntitySheet[]; report: EntityExportReport }> {
  const entityTypes: TranslatableEntityType[] = [
    ...(options.entityTypes ??
      (options.entityType
        ? [options.entityType]
        : [...DEFAULT_DB_HANDOFF_ENTITY_TYPES])),
  ];

  const genericFoodFields = options.genericFoodFields ??
    options.fields ?? [...DEFAULT_GENERIC_FOOD_EXPORT_FIELDS];

  for (const field of genericFoodFields) {
    if (!isValidFieldForEntity('GenericFood', field)) {
      throw new Error(
        `Field "${field}" is not translatable for GenericFood. Allowed: ${ENTITY_TRANSLATABLE_FIELDS.GenericFood.join(', ')}`,
      );
    }
  }

  const sheets: EntitySheet[] = [];
  const perLocale: EntityExportReport['perLocale'] = Object.fromEntries(
    options.locales.map((locale) => [
      locale,
      { exportedRows: 0, emptyTranslations: 0, sameAsEn: 0 },
    ]),
  );
  const entitiesExported: Record<string, number> = {};
  let totalRows = 0;

  const add = (
    entityType: TranslatableEntityType,
    entityCount: number,
    rows: ExportableRow[],
    existingByKey: Map<string, string>,
    skipEmptyEnglishWithoutTranslation = false,
  ) => {
    entitiesExported[entityType] = entityCount;
    const sheet: EntityWorkbookRow[] = [];
    totalRows += pushBatch({
      sheet,
      locales: options.locales,
      perLocale,
      rows,
      existingByKey,
      skipEmptyEnglishWithoutTranslation,
    });
    // Excel caps sheet names at 31 characters; entity type names are shorter.
    if (sheet.length > 0) {
      sheets.push({ name: entityType, rows: sheet });
    }
  };

  if (entityTypes.includes('GenericFood')) {
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
    const existing = await loadExistingTranslations(
      prisma,
      'GenericFood',
      foods.map((f) => f.id),
      options.locales,
      genericFoodFields,
    );
    const rows: ExportableRow[] = [];
    for (const food of foods) {
      for (const field of genericFoodFields) {
        rows.push({
          entityType: 'GenericFood',
          entityId: food.id,
          naturalKey: String(food.nevoCode),
          field,
          en: englishValueForFoodField(food, field),
        });
      }
    }
    add('GenericFood', foods.length, rows, existing, true);
  }

  if (entityTypes.includes('Dimension')) {
    const dimensions = await prisma.dimension.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { sortOrder: 'asc' },
    });
    const fields = [...ENTITY_TRANSLATABLE_FIELDS.Dimension];
    const existing = await loadExistingTranslations(
      prisma,
      'Dimension',
      dimensions.map((d) => d.id),
      options.locales,
      fields,
    );
    add(
      'Dimension',
      dimensions.length,
      dimensions.flatMap((d) =>
        fields.map((field) => ({
          entityType: 'Dimension' as const,
          entityId: d.id,
          naturalKey: d.code,
          field,
          en: field === 'name' ? d.name : '',
        })),
      ),
      existing,
    );
  }

  if (entityTypes.includes('Topic')) {
    const topics = await prisma.topic.findMany({
      select: { id: true, code: true, name: true },
      orderBy: [{ dimensionId: 'asc' }, { sortOrder: 'asc' }],
    });
    const fields = [...ENTITY_TRANSLATABLE_FIELDS.Topic];
    const existing = await loadExistingTranslations(
      prisma,
      'Topic',
      topics.map((t) => t.id),
      options.locales,
      fields,
    );
    add(
      'Topic',
      topics.length,
      topics.flatMap((t) =>
        fields.map((field) => ({
          entityType: 'Topic' as const,
          entityId: t.id,
          naturalKey: t.code,
          field,
          en: field === 'name' ? t.name : '',
        })),
      ),
      existing,
    );
  }

  if (entityTypes.includes('FoodFact')) {
    const facts = await prisma.foodFact.findMany({
      select: { id: true, code: true, body: true },
      orderBy: { code: 'asc' },
    });
    const fields = [...ENTITY_TRANSLATABLE_FIELDS.FoodFact];
    const existing = await loadExistingTranslations(
      prisma,
      'FoodFact',
      facts.map((f) => f.id),
      options.locales,
      fields,
    );
    add(
      'FoodFact',
      facts.length,
      facts.flatMap((f) =>
        fields.map((field) => ({
          entityType: 'FoodFact' as const,
          entityId: f.id,
          naturalKey: f.code,
          field,
          en: field === 'body' ? f.body : '',
        })),
      ),
      existing,
    );
  }

  if (entityTypes.includes('Quiz') || entityTypes.includes('QuizOption')) {
    const quizzes = await prisma.quiz.findMany({
      select: {
        id: true,
        code: true,
        question: true,
        explanation: true,
        options: {
          select: { id: true, label: true, text: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    if (entityTypes.includes('Quiz')) {
      const fields = [...ENTITY_TRANSLATABLE_FIELDS.Quiz];
      const existing = await loadExistingTranslations(
        prisma,
        'Quiz',
        quizzes.map((q) => q.id),
        options.locales,
        fields,
      );
      add(
        'Quiz',
        quizzes.length,
        quizzes.flatMap((q) =>
          fields.map((field) => ({
            entityType: 'Quiz' as const,
            entityId: q.id,
            naturalKey: q.code,
            field,
            en:
              field === 'question'
                ? q.question
                : field === 'explanation'
                  ? q.explanation
                  : '',
          })),
        ),
        existing,
      );
    }

    if (entityTypes.includes('QuizOption')) {
      const fields = [...ENTITY_TRANSLATABLE_FIELDS.QuizOption];
      const optionsFlat = quizzes.flatMap((q) =>
        q.options.map((o) => ({
          quizCode: q.code,
          id: o.id,
          label: o.label,
          text: o.text,
        })),
      );
      const existing = await loadExistingTranslations(
        prisma,
        'QuizOption',
        optionsFlat.map((o) => o.id),
        options.locales,
        fields,
      );
      add(
        'QuizOption',
        optionsFlat.length,
        optionsFlat.flatMap((o) =>
          fields.map((field) => ({
            entityType: 'QuizOption' as const,
            entityId: o.id,
            naturalKey: `${o.quizCode}:${o.label}`,
            field,
            en: field === 'text' ? o.text : '',
          })),
        ),
        existing,
      );
    }
  }

  if (entityTypes.includes('Mission')) {
    const missions = await prisma.mission.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        goal: true,
        whyItMatters: true,
      },
      orderBy: { code: 'asc' },
    });
    const fields = [...ENTITY_TRANSLATABLE_FIELDS.Mission];
    const existing = await loadExistingTranslations(
      prisma,
      'Mission',
      missions.map((m) => m.id),
      options.locales,
      fields,
    );
    add(
      'Mission',
      missions.length,
      missions.flatMap((m) =>
        fields.map((field) => ({
          entityType: 'Mission' as const,
          entityId: m.id,
          naturalKey: m.code,
          field,
          en:
            field === 'title'
              ? m.title
              : field === 'goal'
                ? m.goal
                : field === 'whyItMatters'
                  ? m.whyItMatters
                  : '',
        })),
      ),
      existing,
    );
  }

  if (entityTypes.includes('Challenge')) {
    const challenges = await prisma.challenge.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        task: true,
        whyItMatters: true,
      },
      orderBy: { code: 'asc' },
    });
    const fields = [...ENTITY_TRANSLATABLE_FIELDS.Challenge];
    const existing = await loadExistingTranslations(
      prisma,
      'Challenge',
      challenges.map((c) => c.id),
      options.locales,
      fields,
    );
    add(
      'Challenge',
      challenges.length,
      challenges.flatMap((c) =>
        fields.map((field) => ({
          entityType: 'Challenge' as const,
          entityId: c.id,
          naturalKey: c.code,
          field,
          en:
            field === 'title'
              ? c.title
              : field === 'task'
                ? c.task
                : field === 'whyItMatters'
                  ? c.whyItMatters
                  : '',
        })),
      ),
      existing,
    );
  }

  if (entityTypes.includes('Quest')) {
    const quests = await prisma.quest.findMany({
      select: { id: true, code: true, title: true, description: true },
      orderBy: { code: 'asc' },
    });
    const fields = [...ENTITY_TRANSLATABLE_FIELDS.Quest];
    const existing = await loadExistingTranslations(
      prisma,
      'Quest',
      quests.map((q) => q.id),
      options.locales,
      fields,
    );
    add(
      'Quest',
      quests.length,
      quests.flatMap((q) =>
        fields.map((field) => ({
          entityType: 'Quest' as const,
          entityId: q.id,
          naturalKey: q.code,
          field,
          en:
            field === 'title'
              ? q.title || ''
              : field === 'description'
                ? q.description || ''
                : '',
        })),
      ),
      existing,
      true,
    );
  }

  if (entityTypes.includes('MicroLearning')) {
    const items = await prisma.microLearning.findMany({
      select: { id: true, code: true, title: true, body: true, tips: true },
      orderBy: { code: 'asc' },
    });
    const fields = [...ENTITY_TRANSLATABLE_FIELDS.MicroLearning];
    const existing = await loadExistingTranslations(
      prisma,
      'MicroLearning',
      items.map((m) => m.id),
      options.locales,
      fields,
    );
    add(
      'MicroLearning',
      items.length,
      items.flatMap((m) =>
        fields.map((field) => ({
          entityType: 'MicroLearning' as const,
          entityId: m.id,
          naturalKey: m.code,
          field,
          en:
            field === 'title'
              ? m.title
              : field === 'body'
                ? m.body
                : field === 'tips'
                  ? m.tips || ''
                  : '',
        })),
      ),
      existing,
      true,
    );
  }

  for (const sheet of sheets) {
    sheet.rows.sort((a, b) => a.key.localeCompare(b.key));
  }

  return {
    sheets,
    report: {
      exportedAt: new Date().toISOString(),
      format: options.format,
      outputPath: options.out,
      entityTypes,
      entityType: entityTypes.join(','),
      fields: genericFoodFields,
      targetLocales: options.locales,
      foodsExported: entitiesExported.GenericFood ?? 0,
      entitiesExported,
      totalRows,
      perLocale,
    },
  };
}

export async function readEntitySpreadsheet(
  filePath: string,
): Promise<{ locale: string; key: string; en: string; translation: string }[]> {
  const rows: {
    locale: string;
    key: string;
    en: string;
    translation: string;
  }[] = [];

  if (filePath.endsWith('.csv')) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = await workbook.csv.readFile(filePath);
    const label = path.basename(filePath);
    // Current format carries the locales as columns. Older exports were one
    // file per locale (entity-handoff.de.csv), so fall back to the file name.
    const localeColumns = localeColumnsOf(worksheet);
    if (localeColumns.length > 0) {
      return worksheetToEntityRows(worksheet, localeColumns, label);
    }

    const localeMatch = label.match(/\.([a-z]{2})\.csv$/i);
    if (!localeMatch) {
      throw new Error(
        'CSV import expects locale columns, or one locale per file ' +
          '(e.g. entity-handoff.de.csv).',
      );
    }
    return legacyWorksheetToEntityRows(
      worksheet,
      localeMatch[1].toLowerCase(),
      label,
    );
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  if (workbook.worksheets.length === 0) {
    throw new Error('Spreadsheet has no sheets');
  }

  for (const sheet of workbook.worksheets) {
    const localeColumns = localeColumnsOf(sheet);
    if (localeColumns.length > 0) {
      rows.push(...worksheetToEntityRows(sheet, localeColumns, sheet.name));
      continue;
    }
    // Legacy workbook: one sheet per locale, with a single `translation` column.
    rows.push(
      ...legacyWorksheetToEntityRows(
        sheet,
        sheet.name.trim().toLowerCase(),
        sheet.name,
      ),
    );
  }
  return rows;
}

/**
 * Reads a cell as plain text.
 *
 * Cells come back as rich text, hyperlinks or formula results depending on how
 * the translator's editor saved the file, so a bare String() would yield
 * "[object Object]" for exactly the rows a partner edited by hand.
 */
function entityCellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('richText' in value) {
      return value.richText.map((part) => part.text).join('');
    }
    if ('text' in value) return entityCellText(value.text);
    if ('result' in value) {
      return entityCellText(value.result);
    }
  }
  return '';
}

function headerColumns(worksheet: ExcelJS.Worksheet): Map<string, number> {
  const headerToCol = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const name = entityCellText(cell.value).trim().toLowerCase();
    if (name) {
      headerToCol.set(name, colNumber);
    }
  });
  return headerToCol;
}

/** Non-English supported locales that appear as columns in the sheet. */
function localeColumnsOf(worksheet: ExcelJS.Worksheet): string[] {
  const headerToCol = headerColumns(worksheet);
  return SUPPORTED_LOCALES.filter(
    (locale) => locale !== DEFAULT_LOCALE && headerToCol.has(locale),
  );
}

/** Reads a sheet whose locales are columns, flattening it to one row per cell. */
function worksheetToEntityRows(
  worksheet: ExcelJS.Worksheet,
  locales: string[],
  sheetLabel: string,
): { locale: string; key: string; en: string; translation: string }[] {
  const headerToCol = headerColumns(worksheet);
  const keyCol = headerToCol.get('key');
  const enCol = headerToCol.get('en');
  if (!keyCol || !enCol) {
    throw new Error(
      `Sheet "${sheetLabel}" must have "key" and "en" columns in row 1`,
    );
  }

  const out: {
    locale: string;
    key: string;
    en: string;
    translation: string;
  }[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const key = entityCellText(row.getCell(keyCol).value).trim();
    if (!key) return;
    const en = entityCellText(row.getCell(enCol).value).trim();

    for (const locale of locales) {
      out.push({
        locale,
        key,
        en,
        translation: entityCellText(
          row.getCell(headerToCol.get(locale)!).value,
        ).trim(),
      });
    }
  });

  return out;
}

function legacyWorksheetToEntityRows(
  worksheet: ExcelJS.Worksheet,
  locale: string,
  sheetLabel: string,
): { locale: string; key: string; en: string; translation: string }[] {
  const headerRow = worksheet.getRow(1);
  const headerToCol = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const name = entityCellText(cell.value).trim().toLowerCase();
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
    const key = entityCellText(row.getCell(keyCol).value).trim();
    if (!key) return;
    out.push({
      locale,
      key,
      en: entityCellText(row.getCell(enCol).value).trim(),
      translation: entityCellText(row.getCell(translationCol).value).trim(),
    });
  });

  return out;
}

async function buildIdResolvers(
  prisma: PrismaClient,
  spreadsheetRows: { key: string }[],
): Promise<Map<TranslatableEntityType, IdResolver>> {
  const needed = new Map<TranslatableEntityType, Set<string>>();

  for (const row of spreadsheetRows) {
    const parsed = parseEntityTranslationKey(row.key);
    if (!parsed) continue;
    if (!needed.has(parsed.entityType)) {
      needed.set(parsed.entityType, new Set());
    }
    needed.get(parsed.entityType)!.add(parsed.naturalKey);
  }

  const resolvers = new Map<TranslatableEntityType, IdResolver>();

  if (needed.has('GenericFood')) {
    const codes = [...needed.get('GenericFood')!]
      .map((k) => Number(k))
      .filter((n) => !Number.isNaN(n));
    const foods = await prisma.genericFood.findMany({
      where: { nevoCode: { in: codes } },
      select: { id: true, nevoCode: true },
    });
    const byCode = new Map(foods.map((f) => [String(f.nevoCode), f.id]));
    resolvers.set('GenericFood', (k) => byCode.get(k));
  }

  const codeEntityLoaders: Array<{
    type: TranslatableEntityType;
    load: () => Promise<Array<{ id: string; code: string }>>;
  }> = [
    {
      type: 'Dimension',
      load: () =>
        prisma.dimension.findMany({ select: { id: true, code: true } }),
    },
    {
      type: 'Topic',
      load: () => prisma.topic.findMany({ select: { id: true, code: true } }),
    },
    {
      type: 'FoodFact',
      load: () =>
        prisma.foodFact.findMany({ select: { id: true, code: true } }),
    },
    {
      type: 'Quiz',
      load: () => prisma.quiz.findMany({ select: { id: true, code: true } }),
    },
    {
      type: 'Mission',
      load: () => prisma.mission.findMany({ select: { id: true, code: true } }),
    },
    {
      type: 'Challenge',
      load: () =>
        prisma.challenge.findMany({ select: { id: true, code: true } }),
    },
    {
      type: 'Quest',
      load: () => prisma.quest.findMany({ select: { id: true, code: true } }),
    },
    {
      type: 'MicroLearning',
      load: () =>
        prisma.microLearning.findMany({ select: { id: true, code: true } }),
    },
  ];

  for (const { type, load } of codeEntityLoaders) {
    if (!needed.has(type)) continue;
    const rows = await load();
    const byCode = new Map(rows.map((r) => [r.code, r.id]));
    resolvers.set(type, (k) => byCode.get(k));
  }

  if (needed.has('QuizOption')) {
    const quizzes = await prisma.quiz.findMany({
      select: {
        code: true,
        options: { select: { id: true, label: true } },
      },
    });
    const byKey = new Map<string, string>();
    for (const quiz of quizzes) {
      for (const option of quiz.options) {
        byKey.set(`${quiz.code}:${option.label}`, option.id);
      }
    }
    resolvers.set('QuizOption', (k) => byKey.get(k));
  }

  return resolvers;
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

  const supportedImportTypes = new Set<string>([
    ...DEFAULT_DB_HANDOFF_ENTITY_TYPES,
  ]);

  const resolvers = await buildIdResolvers(prisma, spreadsheetRows);

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

    if (!supportedImportTypes.has(parsed.entityType)) {
      report.skipped.unsupported_entity_type.push(rowId);
      continue;
    }

    const resolve = resolvers.get(parsed.entityType);
    const entityId = resolve?.(parsed.naturalKey);
    if (!entityId) {
      report.skipped.unknown_entity.push(rowId);
      continue;
    }

    if (!options.dryRun) {
      await prisma.entityTranslation.upsert({
        where: {
          entityType_entityId_locale_field: {
            entityType: parsed.entityType,
            entityId,
            locale: row.locale,
            field: parsed.field,
          },
        },
        create: {
          entityType: parsed.entityType,
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
  console.log(`  entityTypes: ${report.entityTypes.join(', ')}`);
  console.log(`  genericFood fields: ${report.fields.join(', ')}`);
  console.log(`  locales: ${report.targetLocales.join(', ')}`);
  console.log(`  total rows: ${report.totalRows}`);
  console.log(`  output: ${report.outputPath}`);
  for (const [type, count] of Object.entries(report.entitiesExported)) {
    console.log(`  ${type}: ${count} entities`);
  }
  for (const [locale, stats] of Object.entries(report.perLocale)) {
    console.log(
      `  ${locale}: ${stats.exportedRows} rows (${stats.emptyTranslations} empty, ${stats.sameAsEn} same-as-en)`,
    );
  }
}

export function printEntityImportReport(report: EntityImportReport): void {
  console.log(
    `\nEntity translation import${report.dryRun ? ' (dry-run)' : ''}`,
  );
  console.log(`  upserted: ${report.upserted}`);
  for (const [reason, ids] of Object.entries(report.skipped)) {
    if (ids.length > 0) {
      console.log(`  skipped.${reason}: ${ids.length}`);
    }
  }
}

const ENTITY_HEADER_FILL = 'FF1F3864';
const ENTITY_READONLY_HEADER_FILL = 'FF7F7F7F';
const ENTITY_MISSING_FILL = 'FFFFF2CC';

function entityColumnLetter(index: number): string {
  let letter = '';
  let remaining = index;
  while (remaining > 0) {
    const rest = (remaining - 1) % 26;
    letter = String.fromCharCode(65 + rest) + letter;
    remaining = Math.floor((remaining - rest) / 26);
  }
  return letter;
}

function addEntitySheet(
  workbook: ExcelJS.Workbook,
  sheet: EntitySheet,
  locales: string[],
): void {
  const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31));
  worksheet.columns = [
    { header: 'key', key: 'key', width: 44 },
    { header: 'en', key: 'en', width: 60 },
    ...locales.map((locale) => ({ header: locale, key: locale, width: 48 })),
  ];

  for (const entry of sheet.rows) {
    const row = worksheet.addRow({
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

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: colNumber <= 2 ? ENTITY_READONLY_HEADER_FILL : ENTITY_HEADER_FILL,
      },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];

  const lastColumn = entityColumnLetter(2 + locales.length);
  const lastRow = Math.max(sheet.rows.length + 1, 2);
  worksheet.autoFilter = { from: 'A1', to: `${lastColumn}1` };

  // Highlight untranslated cells so partners see the remaining work.
  worksheet.addConditionalFormatting({
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
            bgColor: { argb: ENTITY_MISSING_FILL },
          },
        },
      },
    ],
  });
}

/**
 * Writes the entity handoff workbook.
 *
 * Layout matches the partner translation workbook: one sheet per entity type,
 * with `key`, `en` and one column per locale. CSV output keeps the same shape,
 * one file per sheet, because the locales live in columns rather than sheets.
 */
export async function writeEntityWorkbook(
  sheets: EntitySheet[],
  locales: string[],
  outputPath: string,
  format: 'xlsx' | 'csv',
): Promise<void> {
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });

  if (format === 'csv') {
    const baseName = path.basename(outputPath, path.extname(outputPath));
    const dir = path.dirname(outputPath);

    for (const sheet of sheets) {
      const workbook = new ExcelJS.Workbook();
      addEntitySheet(workbook, sheet, locales);
      await workbook.csv.writeFile(
        path.join(dir, `${baseName}.${sheet.name}.csv`),
        { sheetName: sheet.name.slice(0, 31) },
      );
    }
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'foodmission-data-framework';
  workbook.created = new Date();
  for (const sheet of sheets) {
    addEntitySheet(workbook, sheet, locales);
  }
  await workbook.xlsx.writeFile(outputPath);
}

export {
  parseCsvList,
  resolveTargetLocales,
  runScript,
  writeReportFile,
  writeSpreadsheet,
};
