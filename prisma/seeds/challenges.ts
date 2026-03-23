// challenges.seed.ts
import { PrismaClient, Challenges, ChallengeProgress } from '@prisma/client';

export interface ChallengeSeedData {
  title: string;
  description: string;
  available: boolean;
  startDate: Date;
  endDate: Date;
}

export const challengeData: ChallengeSeedData[] = [
  {
    title: 'Bring Your Own Bag',
    description: 'Use a reusable shopping bag for your groceries today',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
  },
  {
    title: 'Meatless Monday',
    description: 'Go vegetarian for the entire day',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
  },
  {
    title: 'Water Bottle Warrior',
    description: 'Drink only from your reusable water bottle today',
    available: true,
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-06-30'),
  },
  {
    title: 'Zero Waste Shopping',
    description: 'Buy products with minimal or no packaging',
    available: true,
    startDate: new Date('2026-01-15'),
    endDate: new Date('2026-07-15'),
  },
  {
    title: 'Local Hero',
    description: 'Purchase at least 3 locally sourced products',
    available: true,
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-09-01'),
  },
  {
    title: 'Bike to Work',
    description: 'Use your bicycle instead of driving today',
    available: true,
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-10-31'),
  },
  {
    title: 'Energy Saver',
    description: 'Unplug all unused devices for the day',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
  },
  {
    title: 'Compost Champion',
    description: 'Start composting your organic waste today',
    available: false,
    startDate: new Date('2026-05-01'),
    endDate: new Date('2026-11-30'),
  },
  {
    title: 'Digital Detox Hour',
    description: 'Spend one hour without any electronic devices',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
  },
  {
    title: 'Green Commute',
    description: 'Use public transportation or walk to work',
    available: true,
    startDate: new Date('2026-02-15'),
    endDate: new Date('2026-08-15'),
  },
];

export async function seedChallenges(prisma: PrismaClient) {
  console.log('🏆 Seeding challenges and challenge progress...');

  const users = await prisma.user.findMany();

  if (users.length === 0) {
    console.warn('⚠️ No users found, skipping challenge progress seeding');
  }

  const challenges: Challenges[] = [];
  const challengeProgresses: ChallengeProgress[] = [];

  // First, create all challenges
  for (const challengeInfo of challengeData) {
    const challenge = await prisma.challenges.upsert({
      where: {
        id: challengeInfo.title.replace(/\s+/g, '-').toLowerCase(),
      },
      update: {
        title: challengeInfo.title,
        description: challengeInfo.description,
        available: challengeInfo.available,
        startDate: challengeInfo.startDate,
        endDate: challengeInfo.endDate,
      },
      create: {
        id: challengeInfo.title.replace(/\s+/g, '-').toLowerCase(),
        title: challengeInfo.title,
        description: challengeInfo.description,
        available: challengeInfo.available,
        startDate: challengeInfo.startDate,
        endDate: challengeInfo.endDate,
      },
    });

    challenges.push(challenge);
  }

  // Then, create challenge progress for each user
  for (const user of users) {
    for (const challenge of challenges) {
      // Randomize progress and completion for variety
      const isCompleted = Math.random() > 0.7; // 30% chance of being completed
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
