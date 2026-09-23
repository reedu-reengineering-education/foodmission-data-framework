import { FoodyItemType, PrismaClient } from '@prisma/client';

/**
 * Point cost per item, indexed by slot (1-6) within each category.
 */
const COSTS: Record<FoodyItemType, number[]> = {
  [FoodyItemType.ANTENNAS]: [30, 10, 20, 30, 30, 50],
  [FoodyItemType.EARS]: [20, 30, 30, 40, 10, 50],
  [FoodyItemType.GLASSES]: [40, 30, 20, 50, 30, 10],
};

const foodyItems = Object.entries(COSTS).flatMap(([type, costs]) =>
  costs.map((cost, index) => ({
    type: type as FoodyItemType,
    slot: index + 1,
    cost,
  })),
);

export async function seedFoodyItems(prisma: PrismaClient) {
  console.log('🕶️  Seeding Foody personalization items...');

  for (const item of foodyItems) {
    const code = `${item.type}_${item.slot}`;
    await prisma.foodyItem.upsert({
      where: { code },
      update: {
        type: item.type,
        slot: item.slot,
        cost: item.cost,
      },
      create: {
        code,
        type: item.type,
        slot: item.slot,
        cost: item.cost,
      },
    });
  }

  const total = await prisma.foodyItem.count();
  console.log(
    `✅ Upserted ${foodyItems.length} Foody items (${total} total in DB)`,
  );

  return { seeded: foodyItems.length, total };
}
