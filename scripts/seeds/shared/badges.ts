import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import yaml from 'js-yaml';
import { loadCatalogJson } from './food-facts';

export interface BadgeSeedRow {
  code: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  /**
   * Entry in prisma/seeds/data/rules/badges.rules.yml that awards this badge.
   * Omit for a badge that is granted by hand.
   */
  ruleCode?: string | null;
  sortOrder?: number;
}

function badgeRulesPath(): string {
  return path.join(
    process.cwd(),
    'prisma',
    'seeds',
    'data',
    'rules',
    'badges.rules.yml',
  );
}

/**
 * Rule codes the badge rules file actually defines.
 *
 * A badge whose `ruleCode` is missing from it is seeded but silently never
 * awarded, which is a slow and confusing failure. The seed says so instead.
 */
function loadKnownRuleCodes(): Set<string> {
  const filePath = badgeRulesPath();
  if (!fs.existsSync(filePath)) {
    console.warn(`   ⚠️  Badge rules not found: ${filePath}`);
    return new Set();
  }

  const doc = yaml.load(fs.readFileSync(filePath, 'utf8')) as {
    badges?: { code?: string }[];
  } | null;

  return new Set(
    (doc?.badges ?? [])
      .map((entry) => entry.code)
      .filter((code): code is string => typeof code === 'string'),
  );
}

/**
 * Seeds the badge catalog.
 *
 * Badges carry no reward of their own here: the badge *is* the prize. To make
 * one also pay XP or points, create a Reward with `badgeId` pointing at it —
 * BadgeRulesService reads that at award time and credits the wallet.
 */
export async function seedBadges(prisma: PrismaClient) {
  console.log('🏅 Seeding badges...');
  const rows = loadCatalogJson<BadgeSeedRow>('badges.en.json');
  if (rows.length === 0) {
    console.log('   ⏭️  No badges to seed');
    return { seeded: 0, total: await prisma.badge.count() };
  }

  const knownRuleCodes = loadKnownRuleCodes();
  let seeded = 0;

  for (const row of rows) {
    const ruleCode = row.ruleCode ?? null;
    if (ruleCode && !knownRuleCodes.has(ruleCode)) {
      console.warn(
        `   ⚠️  Badge ${row.code} references unknown rule ${ruleCode} — it will never be awarded`,
      );
    }

    const data = {
      name: row.name,
      description: row.description ?? null,
      imageUrl: row.imageUrl ?? null,
      ruleCode,
      sortOrder: row.sortOrder ?? 0,
      available: true,
    };

    await prisma.badge.upsert({
      where: { code: row.code },
      update: data,
      create: { code: row.code, ...data },
    });
    seeded += 1;
  }

  const total = await prisma.badge.count();
  console.log(`✅ Upserted ${seeded} badges (${total} total in DB)`);

  const unseeded = [...knownRuleCodes].filter(
    (code) => !rows.some((row) => row.ruleCode === code),
  );
  if (unseeded.length > 0) {
    console.warn(
      `   ⚠️  Badge rules with no catalog row: ${unseeded.join(', ')}`,
    );
  }

  return { seeded, total };
}
