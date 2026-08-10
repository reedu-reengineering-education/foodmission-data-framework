import { ContentLevel, PrismaClient } from '@prisma/client';
import { loadCatalogJson } from './food-facts';

interface MicroLearningSeedRow {
  code: string;
  dimensionCode?: string | null;
  topicCode?: string | null;
  title: string;
  body: string;
  tips?: string | null;
  level?: ContentLevel | string | null;
  health?: boolean;
  foodChoice?: boolean;
  foodWaste?: boolean;
  available?: boolean;
}

/**
 * Seed micro-learnings from catalog JSON.
 * Task 3.3 has no extractable library yet — JSON is `[]` (no-op).
 */
export async function seedMicroLearnings(prisma: PrismaClient) {
  console.log('💡 Seeding micro-learnings...');
  const rows = loadCatalogJson<MicroLearningSeedRow>('micro-learnings.en.json');
  if (rows.length === 0) {
    console.log('   ⏭️  No micro-learnings to seed (empty catalog)');
    return { seeded: 0 };
  }

  const dimensions = await prisma.dimension.findMany({
    select: { id: true, code: true },
  });
  const dimensionByCode = new Map(dimensions.map((d) => [d.code, d.id]));
  const topics = await prisma.topic.findMany({ select: { id: true, code: true } });
  const topicByCode = new Map(topics.map((t) => [t.code, t.id]));

  let seeded = 0;
  for (const row of rows) {
    const dimensionId = row.dimensionCode
      ? dimensionByCode.get(row.dimensionCode) ?? null
      : null;
    const topicId = row.topicCode
      ? topicByCode.get(row.topicCode) ?? null
      : null;

    await prisma.microLearning.upsert({
      where: { code: row.code },
      update: {
        dimensionId,
        topicId,
        title: row.title,
        body: row.body,
        tips: row.tips ?? null,
        level: (row.level as ContentLevel | null | undefined) ?? null,
        health: row.health ?? false,
        foodChoice: row.foodChoice ?? false,
        foodWaste: row.foodWaste ?? false,
        available: row.available ?? true,
      },
      create: {
        code: row.code,
        dimensionId,
        topicId,
        title: row.title,
        body: row.body,
        tips: row.tips ?? null,
        level: (row.level as ContentLevel | null | undefined) ?? null,
        health: row.health ?? false,
        foodChoice: row.foodChoice ?? false,
        foodWaste: row.foodWaste ?? false,
        available: row.available ?? true,
      },
    });
    seeded += 1;
  }

  console.log(`✅ Upserted ${seeded} micro-learnings`);
  return { seeded };
}
