import { ContentLevel, Mission, PrismaClient } from '@prisma/client';
import { loadCatalogJson } from './food-facts';

export interface MissionCatalogSeedRow {
  code: string;
  dimensionCode: string;
  topicCode?: string | null;
  level: ContentLevel | string;
  title: string;
  duration: string;
  goal: string;
  whyItMatters: string;
  health?: boolean;
  foodChoice?: boolean;
  foodWaste?: boolean;
  available?: boolean;
}

export async function seedMissionsCatalog(
  prisma: PrismaClient,
): Promise<Mission[]> {
  console.log('🎯 Seeding missions (catalog)...');
  const rows = loadCatalogJson<MissionCatalogSeedRow>('missions.en.json');
  if (rows.length === 0) {
    console.log('   ⏭️  No missions to seed');
    return [];
  }

  const dimensions = await prisma.dimension.findMany({
    select: { id: true, code: true },
  });
  const dimensionByCode = new Map(dimensions.map((d) => [d.code, d.id]));
  const topics = await prisma.topic.findMany({ select: { id: true, code: true } });
  const topicByCode = new Map(topics.map((t) => [t.code, t.id]));

  const missionReward = await prisma.reward.findUnique({
    where: { name: 'Standard Mission Reward' },
  });
  if (!missionReward) {
    console.warn(
      '   ⚠️  Standard Mission Reward not found – run seedStandardRewards first',
    );
  }

  const missions: Mission[] = [];
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

    const mission = await prisma.mission.upsert({
      where: { code: row.code },
      update: {
        dimensionId,
        topicId,
        level: row.level as ContentLevel,
        title: row.title,
        duration: row.duration,
        goal: row.goal,
        whyItMatters: row.whyItMatters,
        health: row.health ?? false,
        foodChoice: row.foodChoice ?? false,
        foodWaste: row.foodWaste ?? false,
        available: row.available ?? true,
        rewardId: missionReward?.id ?? null,
      },
      create: {
        code: row.code,
        dimensionId,
        topicId,
        level: row.level as ContentLevel,
        title: row.title,
        duration: row.duration,
        goal: row.goal,
        whyItMatters: row.whyItMatters,
        health: row.health ?? false,
        foodChoice: row.foodChoice ?? false,
        foodWaste: row.foodWaste ?? false,
        available: row.available ?? true,
        rewardId: missionReward?.id ?? null,
      },
    });
    missions.push(mission);
  }

  console.log(`✅ Upserted ${missions.length} missions (${skipped} skipped)`);
  return missions;
}
