import { ContentLevel, PrismaClient } from '@prisma/client';

interface RewardSeedData {
  name: string;
  points: number;
  xp: number;
}

/**
 * Base + difficulty-bonus points/xp per content type, as specified by the
 * partners. Points and xp are equal at every tier.
 */
const scaledRewardValues: Record<
  'Quest' | 'Mission' | 'Challenge' | 'Quiz' | 'Food Fact',
  Record<ContentLevel, number>
> = {
  'Food Fact': { BEGINNER: 3, INTERMEDIATE: 4, ADVANCED: 5 },
  Quiz: { BEGINNER: 5, INTERMEDIATE: 7, ADVANCED: 9 },
  Challenge: { BEGINNER: 15, INTERMEDIATE: 20, ADVANCED: 25 },
  Mission: { BEGINNER: 20, INTERMEDIATE: 30, ADVANCED: 40 },
  Quest: { BEGINNER: 30, INTERMEDIATE: 45, ADVANCED: 60 },
};

const levelLabel: Record<ContentLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const scaledRewards: RewardSeedData[] = Object.entries(
  scaledRewardValues,
).flatMap(([type, byLevel]) =>
  (Object.keys(byLevel) as ContentLevel[]).map((level) => ({
    name: `Standard ${type} Reward - ${levelLabel[level]}`,
    points: byLevel[level],
    xp: byLevel[level],
  })),
);

/** Badge and Survey have no difficulty tiers — one flat reward each. */
const flatRewards: RewardSeedData[] = [
  { name: 'Standard Badge Reward', points: 10, xp: 10 },
  { name: 'Standard Survey Reward', points: 10, xp: 10 },
];

const standardRewards: RewardSeedData[] = [...scaledRewards, ...flatRewards];

export async function seedStandardRewards(prisma: PrismaClient) {
  console.log('🎁 Seeding standard rewards...');

  for (const reward of standardRewards) {
    await prisma.reward.upsert({
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

  const totalRewards = await prisma.reward.count();
  console.log(
    `✅ Upserted ${standardRewards.length} standard rewards (${totalRewards} total in DB)`,
  );

  return {
    seeded: standardRewards.length,
    total: totalRewards,
  };
}
