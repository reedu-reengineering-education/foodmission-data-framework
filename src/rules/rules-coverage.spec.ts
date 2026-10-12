import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import {
  evaluateExpression,
  evaluateRule,
  type UserEventRow,
} from './rule-evaluator';
import { rulesCoverageSchema, RulesCoverageDoc } from './rule-schema';

const DATA_DIR = join(process.cwd(), 'prisma', 'seeds', 'data');
const RULES_PATH = join(DATA_DIR, 'rules', 'rules-coverage.yml');

function loadRules(): RulesCoverageDoc {
  const result = rulesCoverageSchema.validate(
    yaml.load(readFileSync(RULES_PATH, 'utf8')),
    { abortEarly: false, allowUnknown: false },
  );
  expect(result.error?.message).toBeUndefined();
  return result.value as RulesCoverageDoc;
}

function loadCatalogCodes(file: string): string[] {
  const rows = JSON.parse(
    readFileSync(join(DATA_DIR, 'catalog', file), 'utf8'),
  ) as { code: string }[];
  return rows.map((row) => row.code);
}

function duplicates(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

/**
 * Checks the shipped rules-coverage.yml the way `npm run rules:validate` does,
 * but in CI. RulesService only validates the file at boot, so without this a
 * broken rule fails the deployment instead of the pull request.
 *
 * Deliberately not strict: `undecided` entries are allowed while the catalog
 * is still being mapped to events.
 */
describe('mission and challenge rules document', () => {
  const sections = [
    { name: 'missions', catalog: 'missions.en.json' },
    { name: 'challenges', catalog: 'challenges.en.json' },
  ] as const;

  it('validates the shipped rules-coverage.yml', () => {
    const doc = loadRules();
    expect(doc.missions.length).toBeGreaterThan(0);
    expect(doc.challenges.length).toBeGreaterThan(0);
  });

  it.each(sections)('has no duplicate $name codes', ({ name }) => {
    const codes = loadRules()[name].map((entry) => entry.code);
    expect(duplicates(codes)).toEqual([]);
  });

  it.each(sections)(
    'covers every $name catalog code and nothing else',
    ({ name, catalog }) => {
      const ruleCodes = loadRules()
        [name].map((entry) => entry.code)
        .sort();
      const catalogCodes = loadCatalogCodes(catalog).sort();

      // A catalog item with no rule never progresses; a rule with no catalog
      // item is dead config, usually a typo in the code.
      expect(ruleCodes).toEqual(catalogCodes);
    },
  );

  it.each(sections)(
    'evaluates every decided $name rule without throwing',
    ({ name }) => {
      const decided = loadRules()[name].filter(
        (entry) => entry.shape !== 'undecided' && entry.rule,
      );

      // No events means every counter is 0, which is enough to catch a
      // formula that does not parse. Unknown counters are caught by the
      // schema, since `&&` and `?:` can skip the operand holding a typo.
      const failures: string[] = [];
      for (const entry of decided) {
        const rule = entry.rule!;
        try {
          const { counters } = evaluateRule(rule, []);
          if (rule.fail) {
            evaluateExpression(rule.fail, counters);
          }
        } catch (error) {
          failures.push(`${entry.code}: ${(error as Error).message}`);
        }
      }
      expect(failures).toEqual([]);
    },
  );
});

/** The shipped grouped-counter rules, scored against sample ledgers. */
describe('grouped mission rules', () => {
  const rules = loadRules();
  const rule = (code: string) => {
    const entry = rules.missions.find((m) => m.code === code);
    if (!entry?.rule) throw new Error(`${code} has no rule`);
    return entry.rule;
  };
  const startedAt = new Date('2026-01-01T00:00:00.000Z');
  const afterWeek = new Date('2026-01-08T01:00:00.000Z');
  const day = (i: number) => new Date(Date.UTC(2026, 0, 1 + i, 12));
  const bucket = (i: number) => day(i).toISOString().slice(0, 10);

  describe('M.A6.1 (five colours every day)', () => {
    const colours = ['GREEN', 'RED', 'ORANGE', 'YELLOW', 'PURPLE'];
    const week = (lastDay: string[]) =>
      [...Array(7).keys()].map((i) => ({
        eventType: 'NUTRITION_RAINBOW_COLOURS_LOGGED',
        createdAt: day(i),
        metadata: {
          dayBucket: bucket(i),
          colours: i === 6 ? lastDay : colours,
        },
      }));

    it('completes with five colours on each of the 7 days', () => {
      const outcome = evaluateRule(
        rule('M.A6.1'),
        week(['white', 'GREEN', 'RED', 'ORANGE', 'YELLOW']),
        new Date('2026-01-07T23:00:00.000Z'),
        startedAt,
      );
      expect(outcome.completed).toBe(true);
    });

    it('fails at the end of the week when one day has four colours', () => {
      const events = week(colours.slice(0, 4));
      const during = evaluateRule(
        rule('M.A6.1'),
        events,
        new Date('2026-01-07T23:00:00.000Z'),
        startedAt,
      );
      expect(during).toMatchObject({ completed: false, failed: false });
      expect(during.counters.rainbowDays).toBe(6);
      expect(
        evaluateRule(rule('M.A6.1'), events, afterWeek, startedAt).failed,
      ).toBe(true);
    });
  });

  describe('main-meal rules (M.A6.4, M.I6.2)', () => {
    function mealWeek(flags: string[]) {
      const events: UserEventRow[] = [];
      for (let i = 0; i < 7; i++) {
        const mealLogId = `ml-${i}`;
        events.push({
          eventType: 'MEAL_LOGGED',
          createdAt: day(i),
          metadata: {
            mealLogId,
            mealDayBucket: bucket(i),
            body: { typeOfMeal: 'LUNCH' },
          },
        });
        for (const eventType of flags) {
          events.push({
            eventType,
            createdAt: day(i),
            metadata: { mealLogId, mealType: 'LUNCH' },
          });
        }
      }
      // A snack without flags does not count as a main meal.
      events.push({
        eventType: 'MEAL_LOGGED',
        createdAt: day(2),
        metadata: {
          mealLogId: 'snack',
          mealDayBucket: bucket(2),
          body: { typeOfMeal: 'SNACK' },
        },
      });
      return events;
    }

    it('completes when every main meal has three components', () => {
      const events = mealWeek([
        'NUTRITION_PROTEIN_INCLUDED',
        'NUTRITION_HIGH_FIBRE_MEAL',
        'NUTRITION_FRUIT_VEG_SERVING_ADDED',
      ]);
      expect(
        evaluateRule(rule('M.A6.4'), events, afterWeek, startedAt).completed,
      ).toBe(true);
      expect(
        evaluateRule(rule('M.I6.2'), events, afterWeek, startedAt).completed,
      ).toBe(true);
    });

    it('fails M.A6.4 with only two components per meal', () => {
      const events = mealWeek([
        'NUTRITION_PROTEIN_INCLUDED',
        'NUTRITION_HIGH_FIBRE_MEAL',
      ]);
      expect(
        evaluateRule(rule('M.A6.4'), events, afterWeek, startedAt).failed,
      ).toBe(true);
      expect(
        evaluateRule(rule('M.I6.2'), events, afterWeek, startedAt).completed,
      ).toBe(true);
    });
  });

  it('M.I2.4 counts products with two facts each', () => {
    const facts = (productId: string, types: string[]) =>
      types.map((eventType) => ({
        eventType,
        createdAt: day(1),
        metadata: { productId },
      }));
    const events = [
      ...['p1', 'p2', 'p3', 'p4'].flatMap((id) =>
        facts(id, ['SHOPPING_ORIGIN_CHECKED', 'SHOPPING_LOCAL_CHOSEN']),
      ),
      ...facts('p5', ['SHOPPING_ORIGIN_CHECKED']),
    ];
    const outcome = evaluateRule(rule('M.I2.4'), events, day(2), startedAt);
    expect(outcome).toMatchObject({ completed: false, progress: 80 });
  });
});
