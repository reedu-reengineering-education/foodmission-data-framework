import { PrismaClient } from '@prisma/client';

interface RewardSeedData {
  name: string;
  points: number;
  xp: number;
}

const standardRewards: RewardSeedData[] = [
  {
    name: 'Standard Quest Reward',
    points: 50,
    xp: 25,
  },
  {
    name: 'Standard Mission Reward',
    points: 120,
    xp: 80,
  },
  {
    name: 'Standard Challenge Reward',
    points: 90,
    xp: 60,
  },
  {
    name: 'Standard Knowledge Reward',
    points: 40,
    xp: 30,
  },
  {
    name: 'Standard Quiz Reward',
    points: 20,
    xp: 15,
  },
];

export async function seedStandardRewards(prisma: PrismaClient) {
  console.log('🎁 Seeding standard rewards...');

  const db = prisma as PrismaClient & {
    reward: {
      upsert(args: any): Promise<unknown>;
      count(): Promise<number>;
    };
  };

  for (const reward of standardRewards) {
    await db.reward.upsert({
      where: { name: reward.name },
      update: {
        points: reward.points,
        xp: reward.xp,
      },
      create: {
        name: reward.name,
        points: reward.points,
        xp: reward.xp,
      },
    });
  }

  const totalRewards = await db.reward.count();
  console.log(
    `✅ Created/updated ${standardRewards.length} standard rewards (${totalRewards} total)`,
  );

  return {
    seeded: standardRewards.length,
    total: totalRewards,
  };
}
