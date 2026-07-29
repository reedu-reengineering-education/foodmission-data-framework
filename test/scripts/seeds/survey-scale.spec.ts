import * as fs from 'node:fs';
import * as path from 'node:path';
import { SUPPORTED_LOCALES } from '../../../src/i18n/constants';

const SEED_DIR = path.join(process.cwd(), 'prisma', 'seeds', 'data', 'surveys');
const I18N_DIR = path.join(process.cwd(), 'src', 'i18n');

type SurveySeed = {
  questions: { type: string; answers?: unknown }[];
};

describe('survey answer scale', () => {
  it.each([...SUPPORTED_LOCALES])(
    'ships all five Likert labels for %s',
    (locale) => {
      const file = path.join(I18N_DIR, locale, 'surveys.json');
      const content = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
        likert5: Record<string, string>;
      };

      expect(Object.keys(content.likert5).sort()).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
      ]);
      for (const label of Object.values(content.likert5)) {
        expect(label.trim()).toBeTruthy();
      }
    },
  );

  it('keeps seeded questions on the shared 5-point scale', () => {
    const files = fs
      .readdirSync(SEED_DIR)
      .filter((file) => file.endsWith('.json'));

    for (const file of files) {
      const raw = JSON.parse(
        fs.readFileSync(path.join(SEED_DIR, file), 'utf-8'),
      ) as SurveySeed | Record<string, SurveySeed>;
      const surveys =
        file === 'surveys.json'
          ? Object.values(raw as Record<string, SurveySeed>)
          : [raw as SurveySeed];

      for (const survey of surveys) {
        for (const question of survey.questions) {
          expect(question.type).toBe('likert');
          // Answer labels come from src/i18n/<locale>/surveys.json, never
          // from the seed data.
          expect(question.answers).toBeUndefined();
        }
      }
    }
  });
});
