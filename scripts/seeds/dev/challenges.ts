// challenges.seed.ts
import { PrismaClient, Challenge, ChallengeProgress } from '@prisma/client';
import enGamification from '../../../src/i18n/en/gamification.json';

export interface ChallengeSeedData {
  slug: string;
  available: boolean;
  startDate: Date;
  endDate: Date;
}

export const challengeData: ChallengeSeedData[] = [
  {
    slug: 'bring-your-own-bag',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
  },
  {
    slug: 'meatless-monday',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
  },
  {
    slug: 'water-bottle-warrior',
    available: true,
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-06-30'),
  },
  {
    slug: 'zero-waste-shopping',
    available: true,
    startDate: new Date('2026-01-15'),
    endDate: new Date('2026-07-15'),
  },
  {
    slug: 'local-hero',
    available: true,
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-09-01'),
  },
  {
    slug: 'bike-to-work',
    available: true,
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-10-31'),
  },
  {
    slug: 'energy-saver',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
  },
  {
    slug: 'compost-champion',
    available: false,
    startDate: new Date('2026-05-01'),
    endDate: new Date('2026-11-30'),
  },
  {
    slug: 'digital-detox-hour',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
  },
  {
    slug: 'green-commute',
    available: true,
    startDate: new Date('2026-02-15'),
    endDate: new Date('2026-08-15'),
  },
];

function getChallengeCopy(slug: string): { title: string; description: string } {
  const copy = enGamification.challenges[
    slug as keyof typeof enGamification.challenges
  ] as { title: string; description: string } | undefined;

  if (!copy) {
    throw new Error(
      `Missing challenge copy for slug "${slug}" in src/i18n/en/gamification.json`,
    );
  }

  return copy;
}

export async function seedChallenges(prisma: PrismaClient) {
  console.log('🏆 Seeding challenges and challenge progress...');

  const users = await prisma.user.findMany();

  if (users.length === 0) {
    console.warn('⚠️ No users found, skipping challenge progress seeding');
  }

  const challenges: Challenge[] = [];
  const challengeProgresses: ChallengeProgress[] = [];

  for (const challengeInfo of challengeData) {
    const copy = getChallengeCopy(challengeInfo.slug);

    const challenge = await prisma.challenge.upsert({
      where: { slug: challengeInfo.slug },
      update: {
        challengeScope: 'DAILY_STANDALONE',
        title: copy.title,
        description: copy.description,
        available: challengeInfo.available,
        startDate: challengeInfo.startDate,
        endDate: challengeInfo.endDate,
      },
      create: {
        slug: challengeInfo.slug,
        challengeScope: 'DAILY_STANDALONE',
        title: copy.title,
        description: copy.description,
        available: challengeInfo.available,
        startDate: challengeInfo.startDate,
        endDate: challengeInfo.endDate,
      },
    });

    challenges.push(challenge);
  }

  for (const user of users) {
    for (const challenge of challenges) {
      const isCompleted = Math.random() > 0.7;
      const progress = isCompleted ? 100 : Math.floor(Math.random() * 90);

      const challengeProgress = await prisma.challengeProgress.upsert({
        where: {
          userId_challengeId: {
            userId: user.id,
            challengeId: challenge.id,
          },
        },
        update: {
          completed: isCompleted,
          progress: progress,
        },
        create: {
          userId: user.id,
          challengeId: challenge.id,
          completed: isCompleted,
          progress: progress,
        },
      });

      challengeProgresses.push(challengeProgress);
    }
  }

  console.log(`✅ Created/updated ${challenges.length} challenges`);
  console.log(
    `✅ Created/updated ${challengeProgresses.length} challenge progress records for ${users.length} users`,
  );
  return challenges;
}
