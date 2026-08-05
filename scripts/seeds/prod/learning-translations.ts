import { PrismaClient } from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../../src/i18n/constants';

/**
 * Learning content translations (Task 3.3) live under:
 *
 *   prisma/seeds/data/learning/translations/<locale>.json
 *
 * Keys use stable business codes (Dimension.code, Mission.code, …).
 * Empty / omitted values are skipped — partial locale files are fine.
 *
 * Vendor spreadsheet handoff for the same entities remains
 * `i18n:export:db` / `i18n:import:db` (entity_translations).
 */

export type LearningTranslationFile = {
  dimensions?: Record<string, string>;
  topics?: Record<string, string>;
  foodFacts?: Record<string, { body?: string }>;
  quizzes?: Record<
    string,
    {
      question?: string;
      explanation?: string;
      options?: Record<string, string>;
    }
  >;
  missions?: Record<
    string,
    { title?: string; goal?: string; whyItMatters?: string }
  >;
  challenges?: Record<
    string,
    { title?: string; task?: string; whyItMatters?: string }
  >;
  quests?: Record<string, { title?: string; description?: string }>;
  microLearnings?: Record<
    string,
    { title?: string; body?: string; tips?: string }
  >;
};

export const LEARNING_TRANSLATIONS_DIR = path.join(
  'prisma',
  'seeds',
  'data',
  'learning',
  'translations',
);

export function learningTranslationsDir(): string {
  return path.join(process.cwd(), LEARNING_TRANSLATIONS_DIR);
}

/** Non-English locales that may have a learning translation file. */
export const LEARNING_TRANSLATED_LOCALES = SUPPORTED_LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE,
);

export function learningTranslationFilePath(locale: string): string {
  return path.join(learningTranslationsDir(), `${locale}.json`);
}

export function loadLearningTranslationFile(
  locale: string,
): LearningTranslationFile {
  const filePath = learningTranslationFilePath(locale);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Learning translation file not found: ${filePath}`);
  }
  return JSON.parse(
    fs.readFileSync(filePath, 'utf-8'),
  ) as LearningTranslationFile;
}

export type LearningTranslationReport = {
  upserted: number;
  localesLoaded: string[];
  unknownCodes: string[];
};

export async function seedLearningTranslations(
  prisma: PrismaClient,
  options: { dryRun?: boolean; locales?: string[] } = {},
): Promise<LearningTranslationReport> {
  const dryRun = options.dryRun ?? false;
  const locales = options.locales ?? LEARNING_TRANSLATED_LOCALES;
  const report: LearningTranslationReport = {
    upserted: 0,
    localesLoaded: [],
    unknownCodes: [],
  };

  const [dimensions, topics, foodFacts, quizzes, missions, challenges, quests] =
    await Promise.all([
      prisma.dimension.findMany({ select: { id: true, code: true } }),
      prisma.topic.findMany({ select: { id: true, code: true } }),
      prisma.foodFact.findMany({ select: { id: true, code: true } }),
      prisma.quiz.findMany({
        select: {
          id: true,
          code: true,
          options: {
            select: { id: true, label: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      prisma.mission.findMany({ select: { id: true, code: true } }),
      prisma.challenge.findMany({ select: { id: true, code: true } }),
      prisma.quest.findMany({ select: { id: true, code: true } }),
    ]);

  const dimensionByCode = new Map(dimensions.map((d) => [d.code, d]));
  const topicByCode = new Map(topics.map((t) => [t.code, t]));
  const foodFactByCode = new Map(foodFacts.map((f) => [f.code, f]));
  const quizByCode = new Map(quizzes.map((q) => [q.code, q]));
  const missionByCode = new Map(missions.map((m) => [m.code, m]));
  const challengeByCode = new Map(challenges.map((c) => [c.code, c]));
  const questByCode = new Map(quests.map((q) => [q.code, q]));

  const upsert = async (
    entityType: string,
    entityId: string,
    locale: string,
    field: string,
    value: string | undefined,
  ) => {
    if (!value?.trim()) {
      return;
    }
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
        create: {
          entityType,
          entityId,
          locale,
          field,
          value: value.trim(),
        },
        update: { value: value.trim() },
      });
    }
    report.upserted += 1;
  };

  for (const locale of locales) {
    const filePath = learningTranslationFilePath(locale);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const file = loadLearningTranslationFile(locale);
    report.localesLoaded.push(locale);

    for (const [code, translation] of Object.entries(file.dimensions ?? {})) {
      const row = dimensionByCode.get(code);
      if (!row) {
        report.unknownCodes.push(`${locale}/Dimension/${code}`);
        continue;
      }
      await upsert('Dimension', row.id, locale, 'name', translation);
    }

    for (const [code, translation] of Object.entries(file.topics ?? {})) {
      const row = topicByCode.get(code);
      if (!row) {
        report.unknownCodes.push(`${locale}/Topic/${code}`);
        continue;
      }
      await upsert('Topic', row.id, locale, 'name', translation);
    }

    for (const [code, fields] of Object.entries(file.foodFacts ?? {})) {
      const row = foodFactByCode.get(code);
      if (!row) {
        report.unknownCodes.push(`${locale}/FoodFact/${code}`);
        continue;
      }
      await upsert('FoodFact', row.id, locale, 'body', fields.body);
    }

    for (const [code, fields] of Object.entries(file.quizzes ?? {})) {
      const row = quizByCode.get(code);
      if (!row) {
        report.unknownCodes.push(`${locale}/Quiz/${code}`);
        continue;
      }
      await upsert('Quiz', row.id, locale, 'question', fields.question);
      await upsert('Quiz', row.id, locale, 'explanation', fields.explanation);

      const optionByLabel = new Map(row.options.map((o) => [o.label, o]));
      for (const [label, text] of Object.entries(fields.options ?? {})) {
        const option = optionByLabel.get(label);
        if (!option) {
          report.unknownCodes.push(`${locale}/QuizOption/${code}:${label}`);
          continue;
        }
        await upsert('QuizOption', option.id, locale, 'text', text);
      }
    }

    for (const [code, fields] of Object.entries(file.missions ?? {})) {
      const row = missionByCode.get(code);
      if (!row) {
        report.unknownCodes.push(`${locale}/Mission/${code}`);
        continue;
      }
      await upsert('Mission', row.id, locale, 'title', fields.title);
      await upsert('Mission', row.id, locale, 'goal', fields.goal);
      await upsert(
        'Mission',
        row.id,
        locale,
        'whyItMatters',
        fields.whyItMatters,
      );
    }

    for (const [code, fields] of Object.entries(file.challenges ?? {})) {
      const row = challengeByCode.get(code);
      if (!row) {
        report.unknownCodes.push(`${locale}/Challenge/${code}`);
        continue;
      }
      await upsert('Challenge', row.id, locale, 'title', fields.title);
      await upsert('Challenge', row.id, locale, 'task', fields.task);
      await upsert(
        'Challenge',
        row.id,
        locale,
        'whyItMatters',
        fields.whyItMatters,
      );
    }

    for (const [code, fields] of Object.entries(file.quests ?? {})) {
      const row = questByCode.get(code);
      if (!row) {
        report.unknownCodes.push(`${locale}/Quest/${code}`);
        continue;
      }
      await upsert('Quest', row.id, locale, 'title', fields.title);
      await upsert('Quest', row.id, locale, 'description', fields.description);
    }
  }

  return report;
}

export function printLearningTranslationReport(
  report: LearningTranslationReport,
): void {
  console.log(
    `   locales: ${report.localesLoaded.length ? report.localesLoaded.join(', ') : '(none)'}`,
  );
  console.log(`   upserted: ${report.upserted}`);
  if (report.unknownCodes.length > 0) {
    console.log(`   unknown codes: ${report.unknownCodes.length}`);
  }
}
