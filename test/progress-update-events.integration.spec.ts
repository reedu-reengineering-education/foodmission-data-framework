import { PrismaClient } from '@prisma/client';
import { ModuleRef } from '@nestjs/core';
import { execSync } from 'child_process';
import { PrismaService } from '../src/database/prisma.service';
import { EventType } from '../src/events/event-types';
import { UserEventService } from '../src/events/services/user-event.service';
import { RulesService } from '../src/rules/rules.service';
import { LearningService } from '../src/learning/services/learning.service';
import { LearningTranslationHelper } from '../src/learning/services/learning-translation.helper';
import { GamificationWalletService } from '../src/gamification/services/gamification-wallet.service';
import { MissionProgressService } from '../src/missions/services/mission-progress.service';
import { MissionProgressRepository } from '../src/missions/repositories/mission-progress.repository';
import { ChallengeProgressService } from '../src/challenges/services/challenge-progress.service';
import { ChallengeProgressRepository } from '../src/challenges/repositories/challenge-progress.repository';
import { TranslationService } from '../src/translations/services/translation.service';
import { CompletionRewardService } from '../src/gamification/services/completion-reward.service';
import { QuestProgressService } from '../src/quests/quest-progress.service';
import { AfterCommitQueue } from '../src/common/after-commit/after-commit.queue';
import { DimensionLevelService } from '../src/gamification/services/dimension-level.service';

const testDbUrl = process.env.TEST_DATABASE_URL;
const describeWithDb = testDbUrl ? describe : describe.skip;

const P = 'PUEV';
const PARALLEL = 5;

const times = <T>(n: number, make: () => T): T[] =>
  Array.from({ length: n }, make);

async function cleanup(prisma: PrismaClient) {
  await prisma.user.deleteMany({ where: { keycloakId: { startsWith: P } } });
  await prisma.dimension.deleteMany({ where: { code: { startsWith: P } } });
}

describeWithDb('progress UPDATED events (integration)', () => {
  let prisma: PrismaClient;
  let learning: LearningService;
  let missions: MissionProgressService;
  let challenges: ChallengeProgressService;
  let quests: QuestProgressService;
  let questId: string;
  let userCount = 0;

  const QUIZ = `${P}_QUIZ`;
  const QUEST = `${P}_QUEST`;
  const MISSION = `${P}_MISSION`;
  const CHALLENGE = `${P}_CHALLENGE`;

  async function newUser(): Promise<string> {
    userCount += 1;
    const user = await prisma.user.create({
      data: {
        keycloakId: `${P}-${userCount}`,
        email: `${P.toLowerCase()}-${userCount}@example.com`,
        currentQuestId: questId,
      },
    });
    return user.id;
  }

  function countEvents(userId: string, eventType: string): Promise<number> {
    return prisma.userEvent.count({ where: { userId, eventType } });
  }

  beforeAll(async () => {
    if (!testDbUrl || !/test/i.test(testDbUrl)) {
      throw new Error(`Refusing to run against a non-test DB: ${testDbUrl}`);
    }
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe',
    });
    prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
    const db = prisma as unknown as PrismaService;
    await cleanup(prisma);

    const dimension = await prisma.dimension.create({
      data: { code: `${P}_DIM`, name: 'Puev dimension', sortOrder: 99 },
    });
    const topic = await prisma.topic.create({
      data: {
        code: `${P}_TOPIC`,
        name: 'Puev topic',
        dimensionId: dimension.id,
      },
    });
    await prisma.quiz.create({
      data: {
        code: QUIZ,
        topicId: topic.id,
        level: 'BEGINNER',
        title: 'Puev quiz',
        question: 'q',
        explanation: 'e',
        options: {
          create: [
            { label: 'A', text: 'a', isCorrect: false, sortOrder: 0 },
            { label: 'B', text: 'b', isCorrect: true, sortOrder: 1 },
            { label: 'C', text: 'c', isCorrect: false, sortOrder: 2 },
          ],
        },
      },
    });
    await prisma.mission.create({
      data: {
        code: MISSION,
        dimensionId: dimension.id,
        level: 'BEGINNER',
        title: 'Puev mission',
        duration: '7 days',
        goal: 'goal',
        whyItMatters: 'why',
      },
    });
    await prisma.challenge.create({
      data: {
        code: CHALLENGE,
        dimensionId: dimension.id,
        level: 'BEGINNER',
        title: 'Puev challenge',
        task: 'task',
        whyItMatters: 'why',
      },
    });
    const quest = await prisma.quest.create({
      data: {
        code: QUEST,
        dimensionId: dimension.id,
        level: 'BEGINNER',
        items: {
          create: [
            { contentType: 'MISSION', contentCode: MISSION, sortOrder: 0 },
            { contentType: 'CHALLENGE', contentCode: CHALLENGE, sortOrder: 1 },
          ],
        },
      },
    });
    questId = quest.id;

    const absent = {
      get: () => {
        throw new Error('not mounted');
      },
    } as unknown as ModuleRef;
    const recorder = new UserEventService(
      db,
      { evaluateUserEvent: () => Promise.resolve() } as unknown as RulesService,
      absent,
    );
    const translations = {
      resolveLocale: () => 'en',
      overlayFields: (
        _type: string,
        items: Array<{ id: string }>,
        _locale: string,
        _fields: string[],
        fallbacks: (item: { id: string }) => Record<string, unknown>,
      ) =>
        Promise.resolve(
          Object.fromEntries(items.map((item) => [item.id, fallbacks(item)])),
        ),
      resolveMany: () => Promise.resolve({}),
    };
    const completionRewards = {
      awardCompletion: () => Promise.resolve(null),
    } as unknown as CompletionRewardService;

    learning = new LearningService(
      db,
      translations as unknown as LearningTranslationHelper,
      {} as GamificationWalletService,
      recorder,
    );
    missions = new MissionProgressService(
      new MissionProgressRepository(db),
      translations as unknown as TranslationService,
      recorder,
      completionRewards,
      { getMissionRuleInputs: () => null } as unknown as RulesService,
    );
    challenges = new ChallengeProgressService(
      new ChallengeProgressRepository(db),
      translations as unknown as TranslationService,
      recorder,
      completionRewards,
    );
    quests = new QuestProgressService(
      db,
      recorder,
      completionRewards,
      new AfterCommitQueue(),
      {
        ensureForUser: () => Promise.resolve(),
        levelUpIfComplete: () => Promise.resolve(null),
      } as unknown as DimensionLevelService,
    );
  }, 120_000);

  afterAll(async () => {
    if (prisma) {
      await cleanup(prisma);
      await prisma.$disconnect();
    }
  });

  describe('quiz', () => {
    const answer = (userId: string, selectedLabel: 'A' | 'B' | 'C') =>
      learning.upsertQuizProgress(userId, QUIZ, { selectedLabel });

    it('records every switch back to an earlier answer', async () => {
      const userId = await newUser();

      for (const label of ['A', 'B', 'A', 'B'] as const) {
        await answer(userId, label);
      }

      expect(await countEvents(userId, EventType.QUIZ_ANSWERED)).toBe(1);
      expect(await countEvents(userId, EventType.QUIZ_UPDATED)).toBe(3);
    });

    it('records nothing when the same answer is sent again', async () => {
      const userId = await newUser();

      await answer(userId, 'A');
      await answer(userId, 'A');

      expect(await countEvents(userId, EventType.QUIZ_UPDATED)).toBe(0);
    });

    it('records one change when the same answer arrives several times at once', async () => {
      const userId = await newUser();
      await answer(userId, 'A');

      await Promise.all(times(PARALLEL, () => answer(userId, 'B')));

      expect(await countEvents(userId, EventType.QUIZ_UPDATED)).toBe(1);
    });

    it('records both changes when different answers arrive at once', async () => {
      const userId = await newUser();
      await answer(userId, 'A');

      await Promise.all([answer(userId, 'B'), answer(userId, 'C')]);

      expect(await countEvents(userId, EventType.QUIZ_UPDATED)).toBe(2);
    });
  });

  describe('quest', () => {
    const setProgress = (userId: string, progress: number) =>
      learning.upsertQuestProgress(userId, QUEST, { progress });

    it('records every return to an earlier progress value', async () => {
      const userId = await newUser();

      for (const progress of [10, 50, 30, 50, 30]) {
        await setProgress(userId, progress);
      }

      expect(await countEvents(userId, EventType.QUEST_STARTED)).toBe(1);
      expect(await countEvents(userId, EventType.QUEST_UPDATED)).toBe(4);
    });

    it('records one change when the same progress arrives several times at once', async () => {
      const userId = await newUser();
      await setProgress(userId, 10);

      await Promise.all(times(PARALLEL, () => setProgress(userId, 60)));

      expect(await countEvents(userId, EventType.QUEST_UPDATED)).toBe(1);
    });

    it('records nothing when a recompute lands on the value the API just wrote', async () => {
      const userId = await newUser();
      const mission = await prisma.mission.findUniqueOrThrow({
        where: { code: MISSION },
      });
      await prisma.missionProgress.create({
        data: {
          userId,
          missionId: mission.id,
          progress: 100,
          completed: true,
          status: 'COMPLETED',
        },
      });
      await setProgress(userId, 50);

      await quests.recomputeForUser(userId);

      expect(await countEvents(userId, EventType.QUEST_UPDATED)).toBe(0);
    });
  });

  describe.each([
    {
      kind: 'mission',
      code: MISSION,
      started: EventType.MISSION_STARTED,
      updated: EventType.MISSION_UPDATED,
      update: (userId: string, progress: number) =>
        missions.update(MISSION, { progress }, userId),
    },
    {
      kind: 'challenge',
      code: CHALLENGE,
      started: EventType.CHALLENGE_STARTED,
      updated: EventType.CHALLENGE_UPDATED,
      update: (userId: string, progress: number) =>
        challenges.update(CHALLENGE, { progress }, userId),
    },
  ])('$kind', ({ started, updated, update }) => {
    it('records every return to an earlier progress value', async () => {
      const userId = await newUser();

      for (const progress of [10, 50, 30, 50, 30]) {
        await update(userId, progress);
      }

      expect(await countEvents(userId, started)).toBe(1);
      expect(await countEvents(userId, updated)).toBe(4);
    });

    it('records one change when the same progress arrives several times at once', async () => {
      const userId = await newUser();
      await update(userId, 10);

      await Promise.all(times(PARALLEL, () => update(userId, 60)));

      expect(await countEvents(userId, updated)).toBe(1);
    });

    it('records both changes when different values arrive at once', async () => {
      const userId = await newUser();
      await update(userId, 10);

      await Promise.all([update(userId, 40), update(userId, 70)]);

      expect(await countEvents(userId, updated)).toBe(2);
    });
  });
});
