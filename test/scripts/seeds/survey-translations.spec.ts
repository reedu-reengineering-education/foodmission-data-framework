import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  TRANSLATED_LOCALES,
  loadSurveyTranslationFile,
  surveyTranslationsDir,
} from '../../../scripts/seeds/prod/survey-translations';

type SurveySeed = {
  title: string;
  description?: string;
  questions: { text: string }[];
};

const SEED_DIR = path.join(process.cwd(), 'prisma', 'seeds', 'data', 'surveys');

function readSeededSurveys(): SurveySeed[] {
  // surveys.json is the combined source export and is not seeded itself.
  return fs
    .readdirSync(SEED_DIR)
    .filter((file) => file.endsWith('.json') && file !== 'surveys.json')
    .map(
      (file) =>
        JSON.parse(
          fs.readFileSync(path.join(SEED_DIR, file), 'utf-8'),
        ) as SurveySeed,
    );
}

describe('survey translation files', () => {
  const surveys = readSeededSurveys();
  const englishTitles = surveys.map((s) => s.title);
  const englishQuestions = [
    ...new Set(surveys.flatMap((s) => s.questions.map((q) => q.text))),
  ];

  it('has a file for every supported locale except English', () => {
    for (const locale of TRANSLATED_LOCALES) {
      expect(
        fs.existsSync(path.join(surveyTranslationsDir(), `${locale}.json`)),
      ).toBe(true);
    }
  });

  it.each([...TRANSLATED_LOCALES])(
    'translates every seeded survey and question (%s)',
    (locale) => {
      const file = loadSurveyTranslationFile(locale);

      for (const title of englishTitles) {
        expect(file.surveys[title]?.title?.trim()).toBeTruthy();
        expect(file.surveys[title]?.description?.trim()).toBeTruthy();
      }

      for (const text of englishQuestions) {
        expect(file.questions[text]?.trim()).toBeTruthy();
      }
    },
  );

  it.each([...TRANSLATED_LOCALES])(
    'contains no keys that are not seeded (%s)',
    (locale) => {
      const file = loadSurveyTranslationFile(locale);

      expect(
        Object.keys(file.surveys).filter((k) => !englishTitles.includes(k)),
      ).toEqual([]);
      expect(
        Object.keys(file.questions).filter(
          (k) => !englishQuestions.includes(k),
        ),
      ).toEqual([]);
    },
  );
});
