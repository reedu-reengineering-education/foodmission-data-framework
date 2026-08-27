import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../../src/i18n/constants';

/**
 * Survey translations live next to the survey seed data:
 *
 *   prisma/seeds/data/surveys/translations/<locale>.json
 *
 * Surveys are keyed by their English title (unique in the DB), questions by
 * their seed key (the `id` field in the survey JSON, e.g. "third use_0") —
 * stored on `Question.key` at seed time. Keying by id instead of by English
 * text keeps translations linked even when the English wording changes.
 */
export type SurveyTranslationFile = {
  surveys: Record<string, { title?: string; description?: string }>;
  questions: Record<string, string>;
};

export const SURVEY_TRANSLATIONS_DIR = path.join(
  'prisma',
  'seeds',
  'data',
  'surveys',
  'translations',
);

/** Locales that need translation files (everything but English). */
export const TRANSLATED_LOCALES = SUPPORTED_LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE,
);

export function surveyTranslationsDir(): string {
  return path.join(process.cwd(), SURVEY_TRANSLATIONS_DIR);
}

export function loadSurveyTranslationFile(
  locale: string,
): SurveyTranslationFile {
  const filePath = path.join(surveyTranslationsDir(), `${locale}.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as SurveyTranslationFile;
}

export function loadSurveyTranslations(): Record<
  string,
  SurveyTranslationFile
> {
  return Object.fromEntries(
    TRANSLATED_LOCALES.map((locale) => [
      locale,
      loadSurveyTranslationFile(locale),
    ]),
  );
}

export type SurveyTranslationReport = {
  upserted: number;
  /** Survey titles present in a translation file but missing in the DB. */
  unknownSurveys: string[];
  /** Question keys present in a translation file but missing in the DB. */
  unknownQuestions: string[];
  /** Survey titles / question keys in the DB without a translation, per locale. */
  missingTranslations: string[];
};

/**
 * Load survey/question translations from the JSON files into
 * `entity_translations`. Idempotent — existing rows are overwritten.
 */
export async function seedSurveyTranslations(
  prisma: PrismaClient,
  options: { dryRun?: boolean } = {},
): Promise<SurveyTranslationReport> {
  const dryRun = options.dryRun ?? false;
  const report: SurveyTranslationReport = {
    upserted: 0,
    unknownSurveys: [],
    unknownQuestions: [],
    missingTranslations: [],
  };

  const surveys = await prisma.survey.findMany({
    include: { questions: true },
  });
  const surveyIdByTitle = new Map(surveys.map((s) => [s.title, s.id]));

  // Question.key holds the seed id (e.g. "third use_0"), set by seedSurveys().
  // Questions seeded before `key` existed have none yet — skip them here,
  // they'll pick up a key next time the survey seed runs.
  const questionIdByKey = new Map<string, string>();
  for (const survey of surveys) {
    for (const question of survey.questions) {
      if (question.key) {
        questionIdByKey.set(question.key, question.id);
      }
    }
  }

  // The survey seed recreates questions on every run, so translations of
  // questions that no longer exist would linger.
  const liveQuestionIds = [...questionIdByKey.values()];
  if (!dryRun && liveQuestionIds.length > 0) {
    await prisma.entityTranslation.deleteMany({
      where: { entityType: 'Question', entityId: { notIn: liveQuestionIds } },
    });
  }

  const upsert = async (
    entityType: 'Survey' | 'Question',
    entityId: string,
    locale: string,
    field: string,
    value: string,
  ) => {
    if (!dryRun) {
      await prisma.entityTranslation.upsert({
        where: {
          entityType_entityId_locale_field: {
            entityType,
            entityId,
            locale,
            field,
          },
        },
        create: { entityType, entityId, locale, field, value },
        update: { value },
      });
    }
    report.upserted += 1;
  };

  for (const locale of TRANSLATED_LOCALES) {
    const file = loadSurveyTranslationFile(locale);

    for (const [englishTitle, fields] of Object.entries(file.surveys)) {
      const surveyId = surveyIdByTitle.get(englishTitle);
      if (!surveyId) {
        report.unknownSurveys.push(`${locale}/${englishTitle}`);
        continue;
      }
      if (fields.title?.trim()) {
        await upsert('Survey', surveyId, locale, 'title', fields.title.trim());
      }
      if (fields.description?.trim()) {
        await upsert(
          'Survey',
          surveyId,
          locale,
          'description',
          fields.description.trim(),
        );
      }
    }

    for (const [questionKey, translation] of Object.entries(file.questions)) {
      const questionId = questionIdByKey.get(questionKey);
      if (!questionId) {
        report.unknownQuestions.push(`${locale}/${questionKey}`);
        continue;
      }
      if (!translation.trim()) {
        continue;
      }
      await upsert('Question', questionId, locale, 'text', translation.trim());
    }

    for (const survey of surveys) {
      if (!file.surveys[survey.title]) {
        report.missingTranslations.push(`${locale}/Survey/${survey.title}`);
      }
    }
    for (const key of questionIdByKey.keys()) {
      if (!file.questions[key]) {
        report.missingTranslations.push(`${locale}/Question/${key}`);
      }
    }
  }

  return report;
}

export function printSurveyTranslationReport(
  report: SurveyTranslationReport,
): void {
  console.log(`   upserted: ${report.upserted}`);
  if (report.unknownSurveys.length > 0) {
    console.log(`   unknown surveys: ${report.unknownSurveys.length}`);
  }
  if (report.unknownQuestions.length > 0) {
    console.log(`   unknown questions: ${report.unknownQuestions.length}`);
  }
  if (report.missingTranslations.length > 0) {
    console.log(
      `   missing translations: ${report.missingTranslations.length}`,
    );
  }
}
