#!/usr/bin/env ts-node

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import yaml from 'js-yaml';
import { rulesCoverageSchema } from '../../src/rules/rule-schema';

type CatalogItem = { code: string };

type RuleEntry = {
  code: string;
  shape: string;
  rule?: unknown;
};

type RulesDoc = {
  missions: RuleEntry[];
  challenges: RuleEntry[];
};

const DEFAULT_RULES_FILE =
  'prisma/seeds/data/rules/drafts/rules-coverage.draft.yml';
const MISSION_CATALOG = 'prisma/seeds/data/catalog/missions.en.json';
const CHALLENGE_CATALOG = 'prisma/seeds/data/catalog/challenges.en.json';

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function readYaml(path: string): unknown {
  return yaml.load(readFileSync(path, 'utf8'));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      dup.add(value);
    }
    seen.add(value);
  }
  return [...dup].sort((a, b) => a.localeCompare(b));
}

function diff(expected: string[], actual: string[]): string[] {
  const actualSet = new Set(actual);
  return expected.filter((value) => !actualSet.has(value));
}

function summarize(entries: RuleEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const entry of entries) {
    out[entry.shape] = (out[entry.shape] ?? 0) + 1;
  }
  return out;
}

function main(): void {
  const { values } = parseArgs({
    options: {
      file: { type: 'string', default: DEFAULT_RULES_FILE },
      strict: { type: 'boolean', default: false },
    },
  });

  const rulesPath = values.file ?? DEFAULT_RULES_FILE;
  const strict = values.strict ?? false;

  const raw = readYaml(rulesPath);
  const validated = rulesCoverageSchema.validate(raw, {
    abortEarly: false,
    allowUnknown: false,
  });

  if (validated.error) {
    console.error('Rule YAML schema validation failed:');
    for (const detail of validated.error.details) {
      console.error(`- ${detail.message} at ${detail.path.join('.')}`);
    }
    process.exit(1);
  }

  const doc = validated.value as RulesDoc;
  const missionCatalog = readJson<CatalogItem[]>(MISSION_CATALOG);
  const challengeCatalog = readJson<CatalogItem[]>(CHALLENGE_CATALOG);

  const missionCodes = doc.missions.map((item) => item.code);
  const challengeCodes = doc.challenges.map((item) => item.code);

  const duplicateMissionCodes = findDuplicates(missionCodes);
  const duplicateChallengeCodes = findDuplicates(challengeCodes);

  if (duplicateMissionCodes.length > 0 || duplicateChallengeCodes.length > 0) {
    console.error('Duplicate rule codes detected:');
    if (duplicateMissionCodes.length > 0) {
      console.error(`- missions: ${duplicateMissionCodes.join(', ')}`);
    }
    if (duplicateChallengeCodes.length > 0) {
      console.error(`- challenges: ${duplicateChallengeCodes.join(', ')}`);
    }
    process.exit(1);
  }

  const expectedMissionCodes = uniqueSorted(
    missionCatalog.map((item) => item.code),
  );
  const expectedChallengeCodes = uniqueSorted(
    challengeCatalog.map((item) => item.code),
  );

  const missingMissions = diff(
    expectedMissionCodes,
    uniqueSorted(missionCodes),
  );
  const missingChallenges = diff(
    expectedChallengeCodes,
    uniqueSorted(challengeCodes),
  );

  if (missingMissions.length > 0 || missingChallenges.length > 0) {
    console.error('Catalog coverage gaps detected:');
    if (missingMissions.length > 0) {
      console.error(`- missing mission rules: ${missingMissions.join(', ')}`);
    }
    if (missingChallenges.length > 0) {
      console.error(
        `- missing challenge rules: ${missingChallenges.join(', ')}`,
      );
    }
    process.exit(1);
  }

  const missionUndecided = doc.missions.filter(
    (entry) => entry.shape === 'undecided',
  ).length;
  const challengeUndecided = doc.challenges.filter(
    (entry) => entry.shape === 'undecided',
  ).length;

  console.log('Rules draft validation OK');
  console.log(`- missions: ${doc.missions.length}`);
  console.log(`- challenges: ${doc.challenges.length}`);
  console.log(`- mission undecided: ${missionUndecided}`);
  console.log(`- challenge undecided: ${challengeUndecided}`);
  console.log(`- mission shapes: ${JSON.stringify(summarize(doc.missions))}`);
  console.log(
    `- challenge shapes: ${JSON.stringify(summarize(doc.challenges))}`,
  );

  if (strict && (missionUndecided > 0 || challengeUndecided > 0)) {
    console.error('Strict mode failed: undecided rules remain');
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
