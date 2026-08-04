import { PrismaClient } from '@prisma/client';
import { seedFoodFacts } from './food-facts';
import { seedQuizzes } from './quizzes';
import { seedMissionsCatalog } from './missions-catalog';
import { seedChallengesCatalog } from './challenges-catalog';
import { seedQuests } from './quests';
import { seedMicroLearnings } from './micro-learnings';

/** Seed all Task 3.3 catalog content (facts → quizzes → missions → challenges → quests → micro-learnings). */
export async function seedCatalogContent(prisma: PrismaClient) {
  const foodFacts = await seedFoodFacts(prisma);
  const quizzes = await seedQuizzes(prisma);
  const missions = await seedMissionsCatalog(prisma);
  const challenges = await seedChallengesCatalog(prisma);
  const quests = await seedQuests(prisma);
  const microLearnings = await seedMicroLearnings(prisma);

  return {
    foodFacts,
    quizzes,
    missions,
    challenges,
    quests,
    microLearnings,
  };
}
