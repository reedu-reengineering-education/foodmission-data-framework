import { Challenge, ContentLevel, PrismaClient } from '@prisma/client';
import { loadCatalogJson } from './food-facts';

export interface ChallengeCatalogSeedRow {
  code: string;
  dimensionCode: string;
  topicCode?: string | null;
  level: ContentLevel | string;
  title: string;
  task: string;
  whyItMatters: string;
  health?: boolean;
  foodChoice?: boolean;
  foodWaste?: boolean;
  available?: boolean;
}

export async function seedChallengesCatalog(
  prisma: PrismaClient,
): Promise<Challenge[]> {
  console.log('🏆 Seeding challenges (catalog)...');
  const rows = loadCatalogJson<ChallengeCatalogSeedRow>('challenges.en.json');
  if (rows.length === 0) {
    console.log('   ⏭️  No challenges to seed');
    return [];
  }

  const dimensions = await prisma.dimension.findMany({
    select: { id: true, code: true },
  });
  const dimensionByCode = new Map(dimensions.map((d) => [d.code, d.id]));
  const topics = await prisma.topic.findMany({ select: { id: true, code: true } });
  const topicByCode = new Map(topics.map((t) => [t.code, t.id]));

  const challenges: Challenge[] = [];
  let skipped = 0;

  for (const row of rows) {
    const dimensionId = dimensionByCode.get(row.dimensionCode);
    if (!dimensionId) {
      console.warn(
        `   ⚠️  Unknown dimension ${row.dimensionCode} for ${row.code}`,
      );
      skipped += 1;
      continue;
    }

    const topicId = row.topicCode ? topicByCode.get(row.topicCode) ?? null : null;
    if (row.topicCode && !topicId) {
      console.warn(`   ⚠️  Unknown topic ${row.topicCode} for ${row.code}`);
    }

    const challenge = await prisma.challenge.upsert({
      where: { code: row.code },
      update: {
        dimensionId,
        topicId,
        level: row.level as ContentLevel,
        title: row.title,
        task: row.task,
        whyItMatters: row.whyItMatters,
        health: row.health ?? false,
        foodChoice: row.foodChoice ?? false,
        foodWaste: row.foodWaste ?? false,
        available: row.available ?? true,
      },
      create: {
        code: row.code,
        dimensionId,
        topicId,
        level: row.level as ContentLevel,
        title: row.title,
        task: row.task,
        whyItMatters: row.whyItMatters,
        health: row.health ?? false,
        foodChoice: row.foodChoice ?? false,
        foodWaste: row.foodWaste ?? false,
        available: row.available ?? true,
      },
    });
    challenges.push(challenge);
  }

  console.log(
    `✅ Upserted ${challenges.length} challenges (${skipped} skipped)`,
  );
  return challenges;
}
