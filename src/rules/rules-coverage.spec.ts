import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { evaluateExpression, evaluateRule } from './rule-evaluator';
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
      // formula that names an unknown counter or does not parse.
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
