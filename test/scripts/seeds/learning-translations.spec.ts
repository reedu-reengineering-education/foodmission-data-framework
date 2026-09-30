import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  LEARNING_TRANSLATED_LOCALES,
  learningTranslationFilePath,
  loadLearningTranslationFile,
} from '../../../scripts/seeds/prod/learning-translations';

describe('learning translation files', () => {
  it('loads de.json with pilot learning strings', () => {
    const filePath = learningTranslationFilePath('de');
    expect(fs.existsSync(filePath)).toBe(true);

    const file = loadLearningTranslationFile('de');
    expect(file.dimensions?.DIET_CHANGES).toContain('Ernährungsumstellung');
    expect(file.topics?.REDUCING_MEAT_CONSUMPTION).toContain('Fleisch');
    expect(file.foodFacts?.['FF1.1.1']?.body).toContain('rotes Fleisch');
    expect(file.quizzes?.['Q1.1.1']?.options?.A).toContain('Linsen');
    expect(file.missions?.['M.A1.1']?.title).toContain('grünen Zone');
    expect(file.challenges?.['CH.A1.1']?.title).toContain('Getreide');
    expect(file.quests?.['QUEST.DIET_CHANGES.BEGINNER.1']?.title).toContain(
      'Anfänger',
    );
    expect(file.badges?.CHEF?.name).toBe('Küchenchef');
  });

  it('translates every badge in the catalog for every locale', () => {
    const catalog = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'prisma/seeds/data/catalog/badges.en.json'),
        'utf-8',
      ),
    ) as { code: string }[];

    for (const locale of LEARNING_TRANSLATED_LOCALES) {
      const badges = loadLearningTranslationFile(locale).badges ?? {};
      for (const { code } of catalog) {
        expect({ locale, code, name: badges[code]?.name }).toEqual({
          locale,
          code,
          name: expect.any(String),
        });
        expect(badges[code]?.description).toEqual(expect.any(String));
      }
    }
  });

  it('keeps translation files under prisma/seeds/data/learning/translations', () => {
    expect(path.basename(path.dirname(learningTranslationFilePath('de')))).toBe(
      'translations',
    );
    expect(
      learningTranslationFilePath('de').includes(
        path.join('learning', 'translations'),
      ),
    ).toBe(true);
  });
});
