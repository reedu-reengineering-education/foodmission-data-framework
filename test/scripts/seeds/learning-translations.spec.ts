import * as fs from 'node:fs';
import * as path from 'node:path';
import {
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
    expect(file.quests?.['QUEST.DIET_CHANGES.BEGINNER']?.title).toContain(
      'Anfänger',
    );
  });

  it('keeps translation files under prisma/seeds/data/learning/translations', () => {
    expect(
      path.basename(path.dirname(learningTranslationFilePath('de'))),
    ).toBe('translations');
    expect(
      learningTranslationFilePath('de').includes(
        path.join('learning', 'translations'),
      ),
    ).toBe(true);
  });
});
