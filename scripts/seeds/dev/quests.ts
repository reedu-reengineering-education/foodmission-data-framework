import { PrismaClient, ProgressTrackingType, Quest, QuestProgress } from '@prisma/client';
import {
  getChallengeSeedCopy,
  getQuestSeedCopy,
} from './gamification-seed-copy';

export interface QuestSeedData {
  slug: string;
  missionSlug: string;
  sortOrder: number;
  available: boolean;
  streakEnabled: boolean;
  progressTrackingType: ProgressTrackingType;
  topicSlug?: string;
}

export const questData: QuestSeedData[] = [
  {
    slug: 'avoid-single-use-plastic',
    missionSlug: 'plastic-free-month',
    sortOrder: 0,
    available: true,
    streakEnabled: true,
    progressTrackingType: ProgressTrackingType.SOFT,
    topicSlug: 'plastic-waste',
  },
  {
    slug: 'reusable-shopping-habit',
    missionSlug: 'plastic-free-month',
    sortOrder: 1,
    available: true,
    streakEnabled: false,
    progressTrackingType: ProgressTrackingType.PRECISION,
  },
  {
    slug: 'three-days-no-meat',
    missionSlug: 'plant-based-journey',
    sortOrder: 0,
    available: true,
    streakEnabled: true,
    progressTrackingType: ProgressTrackingType.SOFT,
    topicSlug: 'plant-based',
  },
  {
    slug: 'try-plant-protein-meals',
    missionSlug: 'plant-based-journey',
    sortOrder: 1,
    available: true,
    streakEnabled: false,
    progressTrackingType: ProgressTrackingType.ACHIEVEMENT,
  },
];

export interface QuestChallengeSeedData {
  slug: string;
  questSlug: string;
  available: boolean;
  startDate: Date;
  endDate: Date;
}

export const questChallengeData: QuestChallengeSeedData[] = [
  {
    slug: 'refuse-plastic-bottle',
    questSlug: 'avoid-single-use-plastic',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
  },
  {
    slug: 'no-meat-today',
    questSlug: 'three-days-no-meat',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
  },
];

export async function seedQuests(prisma: PrismaClient) {
  console.log('🧭 Seeding quests, quest progress, and quest challenges...');

  const users = await prisma.user.findMany();
  const missions = await prisma.mission.findMany();
  const missionBySlug = new Map(missions.map((mission) => [mission.slug, mission]));

  const quests: Quest[] = [];
  const questProgresses: QuestProgress[] = [];
  const questBySlug = new Map<string, Quest>();

  for (const questInfo of questData) {
    const mission = missionBySlug.get(questInfo.missionSlug);

    if (!mission) {
      throw new Error(
        `Mission slug "${questInfo.missionSlug}" not found while seeding quests`,
      );
    }

    const copy = getQuestSeedCopy(questInfo.slug);

    const quest = await prisma.quest.upsert({
      where: { slug: questInfo.slug },
      update: {
        missionId: mission.id,
        title: copy.title,
        description: copy.description,
        topicSlug: questInfo.topicSlug,
        sortOrder: questInfo.sortOrder,
        available: questInfo.available,
        streakEnabled: questInfo.streakEnabled,
        progressTrackingType: questInfo.progressTrackingType,
      },
      create: {
        slug: questInfo.slug,
        missionId: mission.id,
        title: copy.title,
        description: copy.description,
        topicSlug: questInfo.topicSlug,
        sortOrder: questInfo.sortOrder,
        available: questInfo.available,
        streakEnabled: questInfo.streakEnabled,
        progressTrackingType: questInfo.progressTrackingType,
      },
    });

    quests.push(quest);
    questBySlug.set(quest.slug, quest);
  }

  for (const user of users) {
    for (const quest of quests) {
      const currentStreak = quest.streakEnabled
        ? Math.floor(Math.random() * 5)
        : 0;
      const longestStreak = Math.max(
        currentStreak,
        Math.floor(Math.random() * 7),
      );
      const isCompleted = Math.random() > 0.85;
      const progress = isCompleted ? 100 : Math.floor(Math.random() * 80);

      const questProgress = await prisma.questProgress.upsert({
        where: {
          userId_questId: {
            userId: user.id,
            questId: quest.id,
          },
        },
        update: {
          completed: isCompleted,
          progress,
          currentStreak,
          longestStreak,
          lastActionAt: new Date(),
        },
        create: {
          userId: user.id,
          questId: quest.id,
          completed: isCompleted,
          progress,
          currentStreak,
          longestStreak,
          lastActionAt: new Date(),
        },
      });

      questProgresses.push(questProgress);
    }
  }

  for (const challengeInfo of questChallengeData) {
    const quest = questBySlug.get(challengeInfo.questSlug);

    if (!quest) {
      throw new Error(
        `Quest slug "${challengeInfo.questSlug}" not found while seeding quest challenges`,
      );
    }

    const copy = getChallengeSeedCopy(challengeInfo.slug);

    await prisma.challenge.upsert({
      where: { slug: challengeInfo.slug },
      update: {
        questId: quest.id,
        challengeScope: 'QUEST_ONE_TIME',
        title: copy.title,
        description: copy.description,
        available: challengeInfo.available,
        startDate: challengeInfo.startDate,
        endDate: challengeInfo.endDate,
      },
      create: {
        slug: challengeInfo.slug,
        questId: quest.id,
        challengeScope: 'QUEST_ONE_TIME',
        title: copy.title,
        description: copy.description,
        available: challengeInfo.available,
        startDate: challengeInfo.startDate,
        endDate: challengeInfo.endDate,
      },
    });
  }

  console.log(`✅ Created/updated ${quests.length} quests`);
  console.log(
    `✅ Created/updated ${questProgresses.length} quest progress records for ${users.length} users`,
  );
  console.log(`✅ Created/updated ${questChallengeData.length} quest challenges`);

  return quests;
}
