import {
  Challenge,
  ContentLevel,
  PrismaClient,
} from '@prisma/client';
import { KEYCLOAK_DEV_USER_IDS } from './keycloak-dev-user-ids';

export interface ChallengeSeedData {
  code: string;
  title: string;
  task: string;
  whyItMatters: string;
  tags?: string[];
  health?: boolean;
  foodChoice?: boolean;
  foodWaste?: boolean;
  available: boolean;
}

export const challengeData: ChallengeSeedData[] = [
  {
    code: 'CH.B1.1',
    title: 'Bring Your Own Bag',
    task: 'Use a reusable shopping bag for your groceries today',
    whyItMatters: 'Reusable bags cut plastic waste from everyday shopping',
    tags: ['FOOD_CHOICE', 'FOOD_AND_WASTE'],
    foodChoice: true,
    foodWaste: true,
    available: true,
  },
  {
    code: 'CH.B1.2',
    title: 'Meatless Monday',
    task: 'Go vegetarian for the entire day',
    whyItMatters:
      'Even one plant-based day reduces environmental impact of meals',
    tags: ['HEALTH', 'FOOD_CHOICE'],
    health: true,
    foodChoice: true,
    available: true,
  },
  {
    code: 'CH.B1.3',
    title: 'Zero Waste Shopping',
    task: 'Buy products with minimal or no packaging',
    whyItMatters: 'Less packaging means less waste ending up in landfill',
    tags: ['FOOD_AND_WASTE'],
    foodWaste: true,
    available: true,
  },
];

/** Sparse demo progress for named Keycloak users only (not every seeded user). */
const demoProgressByKeycloakId: Record<
  string,
  { code: string; completed: boolean; progress: number }[]
> = {
  [KEYCLOAK_DEV_USER_IDS.devUser1]: [
    { code: 'CH.B1.1', completed: true, progress: 100 },
    { code: 'CH.B1.2', completed: false, progress: 0 },
  ],
  [KEYCLOAK_DEV_USER_IDS.adminUser1]: [
    { code: 'CH.B1.1', completed: false, progress: 50 },
  ],
};

export async function seedChallenges(prisma: PrismaClient) {
  console.log('🏆 Seeding challenges...');

  const dimension = await prisma.dimension.findUnique({
    where: { code: 'DIET_CHANGES' },
  });

  if (!dimension) {
    console.warn(
      '⚠️ Dimension DIET_CHANGES not found, skipping challenge seeding',
    );
    return [];
  }

  const challenges: Challenge[] = [];

  for (const challengeInfo of challengeData) {
    const challenge = await prisma.challenge.upsert({
      where: { code: challengeInfo.code },
      update: {
        dimensionId: dimension.id,
        level: ContentLevel.BEGINNER,
        title: challengeInfo.title,
        task: challengeInfo.task,
        whyItMatters: challengeInfo.whyItMatters,
        health: challengeInfo.health ?? false,
        foodChoice: challengeInfo.foodChoice ?? false,
        foodWaste: challengeInfo.foodWaste ?? false,
        available: challengeInfo.available,
      },
      create: {
        code: challengeInfo.code,
        dimensionId: dimension.id,
        level: ContentLevel.BEGINNER,
        title: challengeInfo.title,
        task: challengeInfo.task,
        whyItMatters: challengeInfo.whyItMatters,
        health: challengeInfo.health ?? false,
        foodChoice: challengeInfo.foodChoice ?? false,
        foodWaste: challengeInfo.foodWaste ?? false,
        available: challengeInfo.available,
      },
    });

    challenges.push(challenge);
  }

  const challengeByCode = new Map(challenges.map((c) => [c.code, c]));
  let progressCount = 0;

  for (const [keycloakId, rows] of Object.entries(demoProgressByKeycloakId)) {
    const user = await prisma.user.findUnique({ where: { keycloakId } });
    if (!user) continue;

    for (const row of rows) {
      const challenge = challengeByCode.get(row.code);
      if (!challenge) continue;

      await prisma.challengeProgress.upsert({
        where: {
          userId_challengeId: {
            userId: user.id,
            challengeId: challenge.id,
          },
        },
        update: {
          completed: row.completed,
          progress: row.progress,
        },
        create: {
          userId: user.id,
          challengeId: challenge.id,
          completed: row.completed,
          progress: row.progress,
        },
      });
      progressCount += 1;
    }
  }

  console.log(`✅ Created/updated ${challenges.length} challenges`);
  console.log(
    `✅ Created/updated ${progressCount} demo challenge progress rows`,
  );
  return challenges;
}
