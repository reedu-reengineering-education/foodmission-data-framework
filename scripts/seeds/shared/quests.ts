import { ContentLevel, PrismaClient, QuestContentType } from '@prisma/client';
import { loadCatalogJson } from './food-facts';

interface QuestItemSeed {
  contentType: QuestContentType | string;
  contentCode: string;
  sortOrder: number;
}

interface QuestSeedRow {
  code: string;
  dimensionCode: string;
  level: ContentLevel | string;
  name?: string;
  title: string;
  description?: string;
  items: QuestItemSeed[];
}

export async function seedQuests(prisma: PrismaClient) {
  console.log('🗺️  Seeding quests...');
  const rows = loadCatalogJson<QuestSeedRow>('quests.en.json');
  if (rows.length === 0) {
    console.log('   ⏭️  No quests to seed');
    return { seeded: 0, items: 0 };
  }

  const dimensions = await prisma.dimension.findMany({
    select: { id: true, code: true },
  });
  const dimensionByCode = new Map(dimensions.map((d) => [d.code, d.id]));

  const questReward = await prisma.reward.findUnique({
    where: { name: 'Standard Quest Reward' },
  });
  if (!questReward) {
    console.warn(
      '   ⚠️  Standard Quest Reward not found – run seedStandardRewards first',
    );
  }

  let seeded = 0;
  let items = 0;
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

    const quest = await prisma.quest.upsert({
      where: { code: row.code },
      update: {
        dimensionId,
        level: row.level as ContentLevel,
        name: row.name,
        title: row.title,
        description: row.description,
        available: true,
        rewardId: questReward?.id ?? null,
      },
      create: {
        code: row.code,
        dimensionId,
        level: row.level as ContentLevel,
        name: row.name,
        title: row.title,
        description: row.description,
        available: true,
        rewardId: questReward?.id ?? null,
      },
    });

    // Replace items so composition matches the seed JSON exactly.
    await prisma.questItem.deleteMany({ where: { questId: quest.id } });

    for (const item of row.items) {
      await prisma.questItem.create({
        data: {
          questId: quest.id,
          contentType: item.contentType as QuestContentType,
          contentCode: item.contentCode,
          sortOrder: item.sortOrder,
        },
      });
      items += 1;
    }

    seeded += 1;
  }

  console.log(
    `✅ Upserted ${seeded} quests / ${items} items (${skipped} skipped)`,
  );
  return { seeded, items, skipped };
}
