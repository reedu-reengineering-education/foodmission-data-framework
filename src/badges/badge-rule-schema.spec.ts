import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { badgeRulesSchema, BadgeRulesDoc } from './badge-rule-schema';

const RULES_PATH = join(
  process.cwd(),
  'prisma',
  'seeds',
  'data',
  'rules',
  'badges.rules.yml',
);
const CATALOG_PATH = join(
  process.cwd(),
  'prisma',
  'seeds',
  'data',
  'catalog',
  'badges.en.json',
);

function loadRules(): BadgeRulesDoc {
  const result = badgeRulesSchema.validate(
    yaml.load(readFileSync(RULES_PATH, 'utf8')),
    { abortEarly: false, allowUnknown: false },
  );
  expect(result.error?.message).toBeUndefined();
  return result.value as BadgeRulesDoc;
}

describe('badge rules document', () => {
  it('validates the shipped badges.rules.yml', () => {
    const doc = loadRules();
    expect(doc.badges.length).toBeGreaterThan(0);
  });

  it('matches the seeded catalog one-to-one on rule code', () => {
    const doc = loadRules();
    const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8')) as {
      code: string;
      ruleCode?: string;
    }[];

    const ruleCodes = doc.badges.map((entry) => entry.code).sort();
    const seededRuleCodes = catalog
      .map((row) => row.ruleCode)
      .filter((code): code is string => typeof code === 'string')
      .sort();

    // A rule with no badge never fires; a badge with no rule is never earned.
    // Both are silent failures in production, so they fail here instead.
    expect(seededRuleCodes).toEqual(ruleCodes);
  });

  it('keeps every badge window at lifetime', () => {
    const doc = loadRules();
    for (const entry of doc.badges) {
      // A dated window would let the clock un-earn a badge, which
      // UserEarnedBadge cannot express.
      expect(entry.rule.window.type).toBe('lifetime');
      for (const counter of Object.values(entry.rule.counters)) {
        expect(counter.window?.type ?? 'lifetime').toBe('lifetime');
      }
    }
  });

  it('rejects a rule whose window has no days outside lifetime', () => {
    const result = badgeRulesSchema.validate({
      schemaVersion: 1,
      status: 'ready',
      purpose: 'test',
      badges: [
        {
          code: 'BROKEN',
          shape: 'count_at_least',
          rule: {
            window: { type: 'since_start' },
            counters: { logged: { event: 'MEAL_LOGGED' } },
            target: 'logged >= 1',
            progress: 'logged',
            notes: [],
          },
        },
      ],
    });

    expect(result.error).toBeDefined();
  });

  it('rejects an unknown event type', () => {
    const result = badgeRulesSchema.validate({
      schemaVersion: 1,
      status: 'ready',
      purpose: 'test',
      badges: [
        {
          code: 'BROKEN',
          shape: 'count_at_least',
          rule: {
            window: { type: 'lifetime' },
            counters: { logged: { event: 'NOT_AN_EVENT' } },
            target: 'logged >= 1',
            progress: 'logged',
            notes: [],
          },
        },
      ],
    });

    expect(result.error).toBeDefined();
  });
});
