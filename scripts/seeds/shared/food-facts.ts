import * as fs from 'node:fs';
import * as path from 'node:path';
import { ContentLevel, PrismaClient, Reward } from '@prisma/client';

const levelLabel: Record<ContentLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

/**
 * Fetches the three per-level "Standard {typeName} Reward - {Level}" rows
 * seeded by `seedStandardRewards`, keyed by `ContentLevel`.
 */
export async function loadRewardsByLevel(
  prisma: PrismaClient,
  typeName: string,
): Promise<Map<ContentLevel, Reward>> {
  const names = (Object.keys(levelLabel) as ContentLevel[]).map(
    (level) => `Standard ${typeName} Reward - ${levelLabel[level]}`,
  );
  const rewards = await prisma.reward.findMany({
    where: { name: { in: names } },
  });
  const rewardsByName = new Map(rewards.map((r) => [r.name, r]));

  const byLevel = new Map<ContentLevel, Reward>();
  for (const level of Object.keys(levelLabel) as ContentLevel[]) {
    const reward = rewardsByName.get(
      `Standard ${typeName} Reward - ${levelLabel[level]}`,
    );
    if (reward) {
      byLevel.set(level, reward);
    }
  }

  if (byLevel.size < 3) {
    console.warn(
      `   ⚠️  Missing some "Standard ${typeName} Reward" tiers – run seedStandardRewards first`,
    );
  }

  return byLevel;
}

export interface FoodFactSeedRow {
  code: string;
  topicCode: string;
  body: string;
  source: string | null;
  level: ContentLevel | string;
  health?: boolean;
  foodChoice?: boolean;
  foodWaste?: boolean;
}

function catalogJsonPath(fileName: string): string {
  return path.join(
    process.cwd(),
    'prisma',
    'seeds',
    'data',
    'catalog',
    fileName,
  );
}

export function loadCatalogJson<T>(fileName: string): T[] {
  const filePath = catalogJsonPath(fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Catalog JSON not found: ${filePath}`);
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T[];
}

export async function seedFoodFacts(prisma: PrismaClient) {
  console.log('📘 Seeding food facts...');
  const rows = loadCatalogJson<FoodFactSeedRow>('food-facts.en.json');
  if (rows.length === 0) {
    console.log('   ⏭️  No food facts to seed');
    return { seeded: 0 };
  }

  const topics = await prisma.topic.findMany({
    select: { id: true, code: true },
  });
  const topicByCode = new Map(topics.map((t) => [t.code, t.id]));
  const rewardsByLevel = await loadRewardsByLevel(prisma, 'Food Fact');

  let seeded = 0;
  let skipped = 0;

  for (const row of rows) {
    const topicId = topicByCode.get(row.topicCode);
    if (!topicId) {
      console.warn(`   ⚠️  Unknown topic ${row.topicCode} for ${row.code}`);
      skipped += 1;
      continue;
    }

    const level = row.level as ContentLevel;
    const rewardId = rewardsByLevel.get(level)?.id ?? null;

    await prisma.foodFact.upsert({
      where: { code: row.code },
      update: {
        topicId,
        body: row.body,
        source: row.source,
        level,
        health: row.health ?? false,
        foodChoice: row.foodChoice ?? false,
        foodWaste: row.foodWaste ?? false,
        available: true,
        rewardId,
      },
      create: {
        code: row.code,
        topicId,
        body: row.body,
        source: row.source,
        level,
        health: row.health ?? false,
        foodChoice: row.foodChoice ?? false,
        foodWaste: row.foodWaste ?? false,
        available: true,
        rewardId,
      },
    });
    seeded += 1;
  }

  console.log(`✅ Upserted ${seeded} food facts (${skipped} skipped)`);
  return { seeded, skipped };
}
