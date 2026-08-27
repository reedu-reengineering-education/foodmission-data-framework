/**
 * Partner translation workbook: one .xlsx with an English column and one column
 * per target locale, grouped into a sheet per content category.
 *
 * Export:  npm run i18n:workbook:export
 * Import:  npm run i18n:workbook:import
 *
 * The workbook is a view over the files that already own the translations:
 *
 *   ui-*             src/i18n/<locale>/<namespace>.json   (shipped with the app)
 *   survey-meta      prisma/seeds/data/surveys/translations/<locale>.json
 *   survey-questions prisma/seeds/data/surveys/translations/<locale>.json
 *   catalog-*        prisma/seeds/data/learning/translations/<locale>.json
 *   food-groups      prisma/seeds/data/nevo/nevo_translations.csv
 *   food-names       prisma/seeds/data/nevo/nevo_translations.csv
 *
 * Import writes the edited cells back into those source files, so the next
 * deployment picks them up via `npm run db:translations` (DB categories) or the
 * regular build (ui-* categories).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../src/i18n/constants';
import {
  LOCALE_COLUMNS,
  parseCsvRecords,
} from '../seeds/import-nevo-translations';
import { dimensionSeedData } from '../seeds/shared/dimensions-topics';
import {
  collectLeafKeys,
  deleteAtPath,
  ensureMetaBlock,
  extractPlaceholders,
  getStringAtPath,
  isJsonObject,
  localeNamespaceFilePath,
  namespaceFromFile,
  pruneUnknownKeys,
  readJsonFile,
  resolveLocaleLayout,
  sameStringArray,
  setValueByPath,
  toError,
  writeJsonFile,
  type JsonObject,
} from './utils';

export const DEFAULT_WORKBOOK_PATH = path.join(
  'translations',
  'foodmission-translations.xlsx',
);

/** First sheet, holds the editing rules and per-sheet stats. */
export const README_SHEET = 'README';

export const TARGET_LOCALES = SUPPORTED_LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE,
);

const projectRoot = path.resolve(__dirname, '../..');
const SURVEY_DATA_DIR = path.join(
  projectRoot,
  'prisma',
  'seeds',
  'data',
  'surveys',
);
const SURVEY_TRANSLATIONS_DIR = path.join(SURVEY_DATA_DIR, 'translations');
const NEVO_CSV = path.join(
  projectRoot,
  'prisma',
  'seeds',
  'data',
  'nevo',
  'nevo_translations.csv',
);
const CATALOG_DATA_DIR = path.join(
  projectRoot,
  'prisma',
  'seeds',
  'data',
  'catalog',
);
const LEARNING_TRANSLATIONS_DIR = path.join(
  projectRoot,
  'prisma',
  'seeds',
  'data',
  'learning',
  'translations',
);

/** Separator inside composite keys — `::` cannot occur in survey titles. */
const KEY_SEPARATOR = '::';

export type WorkbookEntry = {
  /** Stable identity of the row inside its category. Partners must not edit. */
  key: string;
  en: string;
  /** locale -> current translation ('' when missing). */
  translations: Record<string, string>;
};

export type LocaleUpdate = {
  key: string;
  locale: string;
  value: string;
};

export type Category = {
  /** Sheet name (Excel limit: 31 chars). */
  id: string;
  /** Human description shown on the README sheet. */
  title: string;
  /** Source file(s) the category is read from and written back to. */
  source: string;
  /** How the strings reach production. */
  seededBy: 'db:translations' | 'app build';
  /** Whether {{placeholder}} parity between en and the translation is enforced. */
  checkPlaceholders: boolean;
  collect(locales: string[]): WorkbookEntry[];
  /**
   * Applies updates to the source files and prunes keys no longer present in
   * `validKeys` (i.e. dropped from the English source) so re-importing a
   * workbook doesn't leave orphaned translations behind. Returns the touched
   * file paths.
   */
  apply(
    updates: LocaleUpdate[],
    dryRun: boolean,
    context: ApplyContext,
  ): string[];
};

export type ApplyContext = {
  /** All locales in scope for this sheet, including ones with no updates. */
  locales: string[];
  /** Keys currently valid for this category — anything else gets pruned. */
  validKeys: Set<string>;
};

function groupByLocale(updates: LocaleUpdate[]): Map<string, LocaleUpdate[]> {
  const byLocale = new Map<string, LocaleUpdate[]>();
  for (const update of updates) {
    const bucket = byLocale.get(update.locale) ?? [];
    bucket.push(update);
    byLocale.set(update.locale, bucket);
  }
  return byLocale;
}

function relativePath(absolute: string): string {
  return path.relative(projectRoot, absolute) || absolute;
}

// ---------------------------------------------------------------------------
// ui-<namespace>: src/i18n/<locale>/<namespace>.json
// ---------------------------------------------------------------------------

function readNamespaceJson(locale: string, namespaceFile: string): JsonObject {
  const filePath = localeNamespaceFilePath(locale, namespaceFile);
  return fs.existsSync(filePath) ? readJsonFile(filePath) : {};
}

function namespaceCategory(namespaceFile: string): Category {
  const namespace = namespaceFromFile(namespaceFile);

  return {
    id: `ui-${namespace}`,
    title: `App/API strings — ${namespace} namespace`,
    source: `src/i18n/<locale>/${namespaceFile}`,
    seededBy: 'app build',
    checkPlaceholders: true,

    collect(locales) {
      const enJson = readNamespaceJson(DEFAULT_LOCALE, namespaceFile);
      const localeJson = new Map(
        locales.map((locale) => [
          locale,
          readNamespaceJson(locale, namespaceFile),
        ]),
      );

      return collectLeafKeys(enJson)
        .sort()
        .flatMap((key) => {
          const en = getStringAtPath(enJson, key);
          if (en === undefined) {
            return [];
          }

          return [
            {
              key,
              en,
              translations: Object.fromEntries(
                locales.map((locale) => [
                  locale,
                  getStringAtPath(localeJson.get(locale)!, key) ?? '',
                ]),
              ),
            },
          ];
        });
    },

    apply(updates, dryRun, { locales, validKeys }) {
      const touched: string[] = [];
      const updatesByLocale = groupByLocale(updates);

      for (const locale of locales) {
        const filePath = localeNamespaceFilePath(locale, namespaceFile);
        const json = readNamespaceJson(locale, namespaceFile);
        const localeUpdates = updatesByLocale.get(locale) ?? [];

        for (const update of localeUpdates) {
          setValueByPath(json, update.key, update.value);
        }
        const pruned = pruneUnknownKeys(json, validKeys);

        if (localeUpdates.length === 0 && !pruned) {
          continue;
        }

        ensureMetaBlock(json, locale, new Date().toISOString());

        if (!dryRun) {
          writeJsonFile(filePath, json);
        }
        touched.push(relativePath(filePath));
      }

      return touched;
    },
  };
}

// ---------------------------------------------------------------------------
// survey-meta / survey-questions:
//   English source  prisma/seeds/data/surveys/*.json (except surveys.json)
//   Translations    prisma/seeds/data/surveys/translations/<locale>.json
// ---------------------------------------------------------------------------

type EnglishSurvey = {
  title: string;
  description: string;
  questions: { id: string; text: string }[];
};

type SurveyTranslationFile = {
  surveys: Record<string, { title?: string; description?: string }>;
  questions: Record<string, string>;
};

function readEnglishSurveys(): EnglishSurvey[] {
  return fs
    .readdirSync(SURVEY_DATA_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.json') &&
        entry.name !== 'surveys.json',
    )
    .map((entry) => entry.name)
    .sort()
    .map((file) => {
      const parsed = JSON.parse(
        fs.readFileSync(path.join(SURVEY_DATA_DIR, file), 'utf8'),
      ) as EnglishSurvey;
      return {
        title: parsed.title,
        description: parsed.description ?? '',
        questions: parsed.questions ?? [],
      };
    });
}

function surveyTranslationPath(locale: string): string {
  return path.join(SURVEY_TRANSLATIONS_DIR, `${locale}.json`);
}

function readSurveyTranslations(locale: string): SurveyTranslationFile {
  const filePath = surveyTranslationPath(locale);
  if (!fs.existsSync(filePath)) {
    return { surveys: {}, questions: {} };
  }

  const parsed = JSON.parse(
    fs.readFileSync(filePath, 'utf8'),
  ) as Partial<SurveyTranslationFile>;

  return {
    surveys: parsed.surveys ?? {},
    questions: parsed.questions ?? {},
  };
}

function writeSurveyTranslations(
  locale: string,
  file: SurveyTranslationFile,
): string {
  const filePath = surveyTranslationPath(locale);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  return relativePath(filePath);
}

const surveyMetaCategory: Category = {
  id: 'survey-meta',
  title: 'Survey titles and descriptions',
  source: 'prisma/seeds/data/surveys/translations/<locale>.json',
  seededBy: 'db:translations',
  checkPlaceholders: false,

  collect(locales) {
    const surveys = readEnglishSurveys();
    const files = new Map(
      locales.map((locale) => [locale, readSurveyTranslations(locale)]),
    );

    return surveys.flatMap((survey) =>
      (['title', 'description'] as const)
        .filter((field) => survey[field]?.length > 0)
        .map((field) => ({
          key: `${survey.title}${KEY_SEPARATOR}${field}`,
          en: survey[field],
          translations: Object.fromEntries(
            locales.map((locale) => [
              locale,
              files.get(locale)!.surveys[survey.title]?.[field] ?? '',
            ]),
          ),
        })),
    );
  },

  apply(updates, dryRun, { locales, validKeys }) {
    const touched: string[] = [];
    const updatesByLocale = groupByLocale(updates);

    for (const locale of locales) {
      const file = readSurveyTranslations(locale);
      const localeUpdates = updatesByLocale.get(locale) ?? [];

      for (const update of localeUpdates) {
        const separator = update.key.lastIndexOf(KEY_SEPARATOR);
        const title = update.key.slice(0, separator);
        const field = update.key.slice(separator + KEY_SEPARATOR.length);
        const entry = file.surveys[title] ?? {};
        if (field === 'title' || field === 'description') {
          entry[field] = update.value;
        }
        file.surveys[title] = entry;
      }

      let pruned = false;
      for (const title of Object.keys(file.surveys)) {
        const entry = file.surveys[title];
        for (const field of ['title', 'description'] as const) {
          if (
            entry[field] !== undefined &&
            !validKeys.has(`${title}${KEY_SEPARATOR}${field}`)
          ) {
            delete entry[field];
            pruned = true;
          }
        }
        if (Object.keys(entry).length === 0) {
          delete file.surveys[title];
          pruned = true;
        }
      }

      if (localeUpdates.length === 0 && !pruned) {
        continue;
      }

      touched.push(
        dryRun
          ? relativePath(surveyTranslationPath(locale))
          : writeSurveyTranslations(locale, file),
      );
    }

    return touched;
  },
};

/**
 * The same question text is reused by several surveys — group their seed ids
 * by text so the workbook still shows (and asks partners to translate) each
 * text only once, while storage on disk stays keyed by id (see
 * survey-translations.ts for why: ids survive English wording changes,
 * plain text as a key doesn't).
 *
 * Each group's own first id doubles as the workbook row's `key` — stable,
 * matches how every other sheet keys its rows by an internal id rather than
 * the English string.
 */
function questionGroups(): { key: string; text: string; ids: string[] }[] {
  const idsByText = new Map<string, string[]>();
  for (const survey of readEnglishSurveys()) {
    for (const question of survey.questions) {
      if (!question.text?.trim()) {
        continue;
      }
      const ids = idsByText.get(question.text) ?? [];
      ids.push(question.id);
      idsByText.set(question.text, ids);
    }
  }
  return [...idsByText.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([text, ids]) => ({ key: ids[0], text, ids }));
}

const surveyQuestionCategory: Category = {
  id: 'survey-questions',
  title: 'Survey question texts (deduplicated across surveys)',
  source: 'prisma/seeds/data/surveys/translations/<locale>.json',
  seededBy: 'db:translations',
  checkPlaceholders: false,

  collect(locales) {
    const files = new Map(
      locales.map((locale) => [locale, readSurveyTranslations(locale)]),
    );

    return questionGroups().map(({ key, text }) => ({
      key,
      en: text,
      translations: Object.fromEntries(
        locales.map((locale) => [
          locale,
          files.get(locale)!.questions[key] ?? '',
        ]),
      ),
    }));
  },

  apply(updates, dryRun, { locales, validKeys }) {
    const touched: string[] = [];
    const updatesByLocale = groupByLocale(updates);
    const groupByKey = new Map(
      questionGroups().map((group) => [group.key, group]),
    );
    const validIds = new Set(
      [...validKeys].flatMap((key) => groupByKey.get(key)?.ids ?? []),
    );

    for (const locale of locales) {
      const file = readSurveyTranslations(locale);
      const localeUpdates = updatesByLocale.get(locale) ?? [];
      for (const update of localeUpdates) {
        for (const id of groupByKey.get(update.key)?.ids ?? []) {
          file.questions[id] = update.value;
        }
      }

      let pruned = false;
      for (const id of Object.keys(file.questions)) {
        if (!validIds.has(id)) {
          delete file.questions[id];
          pruned = true;
        }
      }

      if (localeUpdates.length === 0 && !pruned) {
        continue;
      }

      touched.push(
        dryRun
          ? relativePath(surveyTranslationPath(locale))
          : writeSurveyTranslations(locale, file),
      );
    }

    return touched;
  },
};

// ---------------------------------------------------------------------------
// food-groups / food-names: prisma/seeds/data/nevo/nevo_translations.csv
// ---------------------------------------------------------------------------

type NevoTable = {
  headers: string[];
  records: Record<string, string>[];
  /** Line ending of the file on disk — the CSV is CRLF and stays that way. */
  eol: string;
};

function readNevoTable(): NevoTable {
  const content = fs.readFileSync(NEVO_CSV, 'utf8');
  const records = parseCsvRecords(content);
  if (records.length === 0) {
    throw new Error(`No rows found in ${relativePath(NEVO_CSV)}`);
  }
  return {
    headers: Object.keys(records[0]),
    records,
    eol: content.includes('\r\n') ? '\r\n' : '\n',
  };
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function writeNevoTable(table: NevoTable): string {
  const lines = [table.headers.map(csvCell).join(',')];
  for (const record of table.records) {
    lines.push(table.headers.map((h) => csvCell(record[h] ?? '')).join(','));
  }
  fs.writeFileSync(NEVO_CSV, `${lines.join(table.eol)}${table.eol}`, 'utf8');
  return relativePath(NEVO_CSV);
}

function nevoColumn(locale: string, field: 'foodName' | 'foodGroup'): string {
  const columns = LOCALE_COLUMNS[locale as keyof typeof LOCALE_COLUMNS];
  const column = columns?.[field];
  if (!column) {
    throw new Error(`NEVO CSV has no ${field} column for locale "${locale}"`);
  }
  return column;
}

const foodGroupCategory: Category = {
  id: 'food-groups',
  title: 'NEVO food groups (one row per distinct English group)',
  source: 'prisma/seeds/data/nevo/nevo_translations.csv',
  seededBy: 'db:translations',
  checkPlaceholders: false,

  collect(locales) {
    const { records } = readNevoTable();
    // A group repeats on hundreds of rows; export it once and pick the most
    // frequent existing translation as the current value.
    const counts = new Map<string, Map<string, Map<string, number>>>();

    for (const record of records) {
      const en = (record.food_group_en ?? '').trim();
      if (!en) continue;

      const perLocale = counts.get(en) ?? new Map();
      for (const locale of locales) {
        const value = (record[nevoColumn(locale, 'foodGroup')] ?? '').trim();
        if (!value) continue;
        const valueCounts = perLocale.get(locale) ?? new Map<string, number>();
        valueCounts.set(value, (valueCounts.get(value) ?? 0) + 1);
        perLocale.set(locale, valueCounts);
      }
      counts.set(en, perLocale);
    }

    return [...counts.keys()].sort().map((en) => ({
      key: en,
      en,
      translations: Object.fromEntries(
        locales.map((locale) => {
          const valueCounts = counts.get(en)?.get(locale);
          if (!valueCounts) return [locale, ''];
          const best = [...valueCounts.entries()].sort(
            (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
          )[0];
          return [locale, best?.[0] ?? ''];
        }),
      ),
    }));
  },

  apply(updates, dryRun) {
    const table = readNevoTable();
    const byLocale = groupByLocale(updates);

    for (const [locale, localeUpdates] of byLocale) {
      const column = nevoColumn(locale, 'foodGroup');
      const valueByEnglishGroup = new Map(
        localeUpdates.map((update) => [update.key, update.value]),
      );

      for (const record of table.records) {
        const value = valueByEnglishGroup.get(
          (record.food_group_en ?? '').trim(),
        );
        if (value !== undefined) {
          record[column] = value;
        }
      }
    }

    return byLocale.size === 0
      ? []
      : [dryRun ? relativePath(NEVO_CSV) : writeNevoTable(table)];
  },
};

const foodNameCategory: Category = {
  id: 'food-names',
  title: 'NEVO food names (key = NEVO code)',
  source: 'prisma/seeds/data/nevo/nevo_translations.csv',
  seededBy: 'db:translations',
  checkPlaceholders: false,

  collect(locales) {
    const { records } = readNevoTable();

    return records
      .filter((record) => (record['NEVO-code'] ?? '').trim().length > 0)
      .map((record) => ({
        key: record['NEVO-code'].trim(),
        en: (record.food_name_en ?? '').trim(),
        translations: Object.fromEntries(
          locales.map((locale) => [
            locale,
            (record[nevoColumn(locale, 'foodName')] ?? '').trim(),
          ]),
        ),
      }));
  },

  apply(updates, dryRun) {
    const table = readNevoTable();
    const byCode = new Map(
      table.records.map((record) => [
        (record['NEVO-code'] ?? '').trim(),
        record,
      ]),
    );
    let changed = false;

    for (const update of updates) {
      const record = byCode.get(update.key);
      if (!record) continue;
      record[nevoColumn(update.locale, 'foodName')] = update.value;
      changed = true;
    }

    return changed
      ? [dryRun ? relativePath(NEVO_CSV) : writeNevoTable(table)]
      : [];
  },
};

// ---------------------------------------------------------------------------
// catalog-*: learning content (Task 3.3)
//   English source  prisma/seeds/data/catalog/*.en.json
//                   + dimensionSeedData for dimensions/topics
//   Translations    prisma/seeds/data/learning/translations/<locale>.json
// ---------------------------------------------------------------------------

type CatalogRow = Record<string, unknown>;

function readCatalogRows(fileName: string): CatalogRow[] {
  const filePath = path.join(CATALOG_DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  return Array.isArray(parsed) ? (parsed as CatalogRow[]) : [];
}

function catalogString(row: CatalogRow, field: string): string {
  const value = row[field];
  return typeof value === 'string' ? value.trim() : '';
}

export function learningTranslationPath(locale: string): string {
  return path.join(LEARNING_TRANSLATIONS_DIR, `${locale}.json`);
}

/** Sheets whose content lives in the learning translation files. */
export const CATALOG_CATEGORY_PREFIX = 'catalog-';

function readLearningFile(locale: string): JsonObject {
  const filePath = learningTranslationPath(locale);
  return fs.existsSync(filePath) ? readJsonFile(filePath) : {};
}

function writeLearningFile(locale: string, file: JsonObject): string {
  const filePath = learningTranslationPath(locale);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  writeJsonFile(filePath, file);
  return relativePath(filePath);
}

function objectAt(parent: JsonObject, key: string): JsonObject {
  const existing = parent[key];
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    return existing as JsonObject;
  }
  const created: JsonObject = {};
  parent[key] = created;
  return created;
}

function readObject(parent: JsonObject, key: string): JsonObject | undefined {
  const value = parent[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

/**
 * Catalog rows are keyed by their business code plus the field path, e.g.
 *   M.B1.1::title
 *   Q1.1.1::options::A
 *   DIET_CHANGES::name        (dimensions/topics hold a bare string)
 */
function catalogKey(code: string, ...fields: string[]): string {
  return [code, ...fields].join(KEY_SEPARATOR);
}

function splitCatalogKey(key: string): { code: string; fields: string[] } {
  const [code, ...fields] = key.split(KEY_SEPARATOR);
  return { code, fields };
}

/** Leaf keys currently stored under a (non-plain) catalog section, e.g. `M.B1.1::title`. */
function collectSectionKeys(section: JsonObject): string[] {
  const keys: string[] = [];

  const walk = (obj: JsonObject, prefix: string[]) => {
    for (const [key, value] of Object.entries(obj)) {
      const path = [...prefix, key];
      if (isJsonObject(value)) {
        walk(value, path);
      } else if (typeof value === 'string') {
        keys.push(path.join(KEY_SEPARATOR));
      }
    }
  };

  walk(section, []);
  return keys;
}

type CatalogEnglishRow = { key: string; en: string };

type CatalogCategoryConfig = {
  id: string;
  title: string;
  /** Top-level key inside the learning translation file. */
  section: string;
  /** Dimensions/topics store a bare string per code instead of a field object. */
  plain?: boolean;
  englishRows(): CatalogEnglishRow[];
};

function catalogCategory(config: CatalogCategoryConfig): Category {
  const readValue = (file: JsonObject, key: string): string => {
    const { code, fields } = splitCatalogKey(key);
    const section = readObject(file, config.section);
    if (!section) {
      return '';
    }

    if (config.plain) {
      const value = section[code];
      return typeof value === 'string' ? value : '';
    }

    let current = readObject(section, code);
    for (const field of fields.slice(0, -1)) {
      current = current ? readObject(current, field) : undefined;
    }
    const value = current?.[fields[fields.length - 1]];
    return typeof value === 'string' ? value : '';
  };

  const writeValue = (file: JsonObject, key: string, value: string): void => {
    const { code, fields } = splitCatalogKey(key);
    const section = objectAt(file, config.section);

    if (config.plain) {
      section[code] = value;
      return;
    }

    let current = objectAt(section, code);
    for (const field of fields.slice(0, -1)) {
      current = objectAt(current, field);
    }
    current[fields[fields.length - 1]] = value;
  };

  return {
    id: config.id,
    title: config.title,
    source: 'prisma/seeds/data/learning/translations/<locale>.json',
    seededBy: 'db:translations',
    checkPlaceholders: false,

    collect(locales) {
      const files = new Map(
        locales.map((locale) => [locale, readLearningFile(locale)]),
      );

      return config.englishRows().map((row) => ({
        key: row.key,
        en: row.en,
        translations: Object.fromEntries(
          locales.map((locale) => [
            locale,
            readValue(files.get(locale)!, row.key),
          ]),
        ),
      }));
    },

    apply(updates, dryRun, { locales, validKeys }) {
      const touched: string[] = [];
      const updatesByLocale = groupByLocale(updates);

      for (const locale of locales) {
        const file = readLearningFile(locale);
        const localeUpdates = updatesByLocale.get(locale) ?? [];
        for (const update of localeUpdates) {
          writeValue(file, update.key, update.value);
        }

        let pruned = false;
        const section = readObject(file, config.section);
        if (section) {
          if (config.plain) {
            const validCodes = new Set(
              [...validKeys].map((key) => splitCatalogKey(key).code),
            );
            for (const code of Object.keys(section)) {
              if (typeof section[code] === 'string' && !validCodes.has(code)) {
                delete section[code];
                pruned = true;
              }
            }
          } else {
            for (const key of collectSectionKeys(section)) {
              if (!validKeys.has(key)) {
                deleteAtPath(section, key.split(KEY_SEPARATOR));
                pruned = true;
              }
            }
          }
        }

        if (localeUpdates.length === 0 && !pruned) {
          continue;
        }

        touched.push(
          dryRun
            ? relativePath(learningTranslationPath(locale))
            : writeLearningFile(locale, file),
        );
      }

      return touched;
    },
  };
}

/** Rows for a catalog JSON where every row has a `code` and plain text fields. */
function catalogFieldRows(fileName: string, fields: string[]) {
  return (): CatalogEnglishRow[] =>
    readCatalogRows(fileName).flatMap((row) => {
      const code = catalogString(row, 'code');
      if (!code) {
        return [];
      }
      return fields.flatMap((field) => {
        const en = catalogString(row, field);
        return en ? [{ key: catalogKey(code, field), en }] : [];
      });
    });
}

const dimensionCategory = catalogCategory({
  id: 'catalog-dimensions',
  title: 'Learning dimensions (names)',
  section: 'dimensions',
  plain: true,
  englishRows: () =>
    dimensionSeedData.map((dimension) => ({
      key: catalogKey(dimension.code, 'name'),
      en: dimension.name,
    })),
});

const topicCategory = catalogCategory({
  id: 'catalog-topics',
  title: 'Learning topics (names)',
  section: 'topics',
  plain: true,
  englishRows: () =>
    dimensionSeedData.flatMap((dimension) =>
      dimension.topics.map((topic) => ({
        key: catalogKey(topic.code, 'name'),
        en: topic.name,
      })),
    ),
});

const foodFactCategory = catalogCategory({
  id: 'catalog-food-facts',
  title: 'Food facts',
  section: 'foodFacts',
  englishRows: catalogFieldRows('food-facts.en.json', ['body']),
});

const quizCategory = catalogCategory({
  id: 'catalog-quizzes',
  title: 'Quiz questions, explanations and answer options',
  section: 'quizzes',
  englishRows: () =>
    readCatalogRows('quizzes.en.json').flatMap((row) => {
      const code = catalogString(row, 'code');
      if (!code) {
        return [];
      }

      const rows: CatalogEnglishRow[] = [];
      for (const field of ['question', 'explanation']) {
        const en = catalogString(row, field);
        if (en) {
          rows.push({ key: catalogKey(code, field), en });
        }
      }

      const options = Array.isArray(row.options)
        ? (row.options as CatalogRow[])
        : [];
      for (const option of options) {
        const label = catalogString(option, 'label');
        const en = catalogString(option, 'text');
        if (label && en) {
          rows.push({ key: catalogKey(code, 'options', label), en });
        }
      }

      return rows;
    }),
});

const missionCategory = catalogCategory({
  id: 'catalog-missions',
  title: 'Missions (title, goal, why it matters)',
  section: 'missions',
  englishRows: catalogFieldRows('missions.en.json', [
    'title',
    'goal',
    'whyItMatters',
  ]),
});

const challengeCategory = catalogCategory({
  id: 'catalog-challenges',
  title: 'Challenges (title, task, why it matters)',
  section: 'challenges',
  englishRows: catalogFieldRows('challenges.en.json', [
    'title',
    'task',
    'whyItMatters',
  ]),
});

const questCategory = catalogCategory({
  id: 'catalog-quests',
  title: 'Quests (name, title, description)',
  section: 'quests',
  englishRows: catalogFieldRows('quests.en.json', [
    'name',
    'title',
    'description',
  ]),
});

const microLearningCategory = catalogCategory({
  id: 'catalog-micro-learnings',
  title: 'Micro-learnings (title, body, tips)',
  section: 'microLearnings',
  englishRows: catalogFieldRows('micro-learnings.en.json', [
    'title',
    'body',
    'tips',
  ]),
});

// ---------------------------------------------------------------------------
// Category registry
// ---------------------------------------------------------------------------

export function buildCategories(): Category[] {
  const { namespaceFiles } = resolveLocaleLayout();

  return [
    ...namespaceFiles.map(namespaceCategory),
    surveyMetaCategory,
    surveyQuestionCategory,
    dimensionCategory,
    topicCategory,
    foodFactCategory,
    quizCategory,
    missionCategory,
    challengeCategory,
    questCategory,
    microLearningCategory,
    foodGroupCategory,
    foodNameCategory,
  ];
}

export function resolveCategories(requested?: string[]): Category[] {
  const categories = buildCategories();
  if (!requested?.length) {
    return categories;
  }

  const byId = new Map(categories.map((category) => [category.id, category]));
  return requested.map((id) => {
    const category = byId.get(id);
    if (!category) {
      throw new Error(
        `Unknown sheet "${id}". Available: ${[...byId.keys()].join(', ')}`,
      );
    }
    return category;
  });
}

export function resolveLocales(requested?: string[]): string[] {
  if (!requested?.length) {
    return [...TARGET_LOCALES];
  }

  for (const locale of requested) {
    if (!(TARGET_LOCALES as readonly string[]).includes(locale)) {
      throw new Error(
        `Unsupported locale "${locale}". Supported: ${TARGET_LOCALES.join(', ')}`,
      );
    }
  }

  return requested;
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

export function checkPlaceholders(en: string, translation: string): boolean {
  return sameStringArray(
    extractPlaceholders(en),
    extractPlaceholders(translation),
  );
}
