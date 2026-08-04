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

function emptyLocaleSheets(locales: string[]): Record<string, LocaleSheetRow[]> {
  return Object.fromEntries(locales.map((locale) => [locale, []]));
}

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

function pushBatch(args: {
  sheets: Record<string, LocaleSheetRow[]>;
  locales: string[];
  perLocale: EntityExportReport['perLocale'];
  rows: ExportableRow[];
  existingByKey: Map<string, string>;
  skipEmptyEnglishWithoutTranslation?: boolean;
}): number {
  const {
    sheets,
    locales,
    perLocale,
    rows,
    existingByKey,
    skipEmptyEnglishWithoutTranslation = false,
  } = args;

  let added = 0;
  for (const locale of locales) {
    for (const row of rows) {
      const current =
        existingByKey.get(`${row.entityId}:${locale}:${row.field}`) ?? '';
      if (skipEmptyEnglishWithoutTranslation && !row.en && !current) {
        continue;
      }
      if (!current) {
        perLocale[locale].emptyTranslations += 1;
      } else if (current === row.en) {
        perLocale[locale].sameAsEn += 1;
      }
      sheets[locale].push({
        key: toEntityTranslationKey(row.entityType, row.naturalKey, row.field),
        en: row.en,
        translation: current,
      });
      perLocale[locale].exportedRows += 1;
      added += 1;
    }
  }
  return added;
}

/** @deprecated Prefer buildEntityExportSheets. */
export async function buildGenericFoodExportSheets(
  prisma: PrismaClient,
  options: EntityExportOptions,
): Promise<{ sheets: Record<string, LocaleSheetRow[]>; report: EntityExportReport }> {
  return buildEntityExportSheets(prisma, {
    ...options,
    entityTypes: ['GenericFood'],
    genericFoodFields:
      options.genericFoodFields ??
      options.fields ??
      [...DEFAULT_GENERIC_FOOD_EXPORT_FIELDS],
  });
}

export async function buildEntityExportSheets(
  prisma: PrismaClient,
  options: EntityExportOptions,
): Promise<{ sheets: Record<string, LocaleSheetRow[]>; report: EntityExportReport }> {
  const entityTypes: TranslatableEntityType[] = [
    ...(options.entityTypes ??
      (options.entityType
        ? [options.entityType]
        : [...DEFAULT_DB_HANDOFF_ENTITY_TYPES])),
  ];

  const genericFoodFields =
    options.genericFoodFields ??
    options.fields ??
    [...DEFAULT_GENERIC_FOOD_EXPORT_FIELDS];

  for (const field of genericFoodFields) {
    if (!isValidFieldForEntity('GenericFood', field)) {
      throw new Error(
        `Field "${field}" is not translatable for GenericFood. Allowed: ${ENTITY_TRANSLATABLE_FIELDS.GenericFood.join(', ')}`,
      );
    }
  }

  const sheets = emptyLocaleSheets(options.locales);
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
    totalRows += pushBatch({
      sheets,
      locales: options.locales,
      perLocale,
      rows,
      existingByKey,
      skipEmptyEnglishWithoutTranslation,
    });
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

  for (const locale of options.locales) {
    sheets[locale].sort((a, b) => a.key.localeCompare(b.key));
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
      load: () =>
        prisma.mission.findMany({ select: { id: true, code: true } }),
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
