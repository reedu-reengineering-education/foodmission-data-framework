import { QuestContentType, RewardSourceType } from '@prisma/client';
import { AfterCommitQueue } from '../common/after-commit/after-commit.queue';
import { ProgressStatus } from '../common/progress-status';
import { PrismaService } from '../database/prisma.service';
import { EventSource, EventType } from '../events/event-types';
import { UserEventService } from '../events/services/user-event.service';
import { CompletionRewardService } from '../gamification/services/completion-reward.service';
import { QuestProgressService } from './quest-progress.service';

type Item = { contentType: QuestContentType; contentCode: string };

const MISSION = (code: string): Item => ({
  contentType: QuestContentType.MISSION,
  contentCode: code,
});
const QUIZ = (code: string): Item => ({
  contentType: QuestContentType.QUIZ,
  contentCode: code,
});
const FOOD_FACT = (code: string): Item => ({
  contentType: QuestContentType.FOOD_FACT,
  contentCode: code,
});
const MICRO = (code: string): Item => ({
  contentType: QuestContentType.MICRO_LEARNING,
  contentCode: code,
});

function buildPrisma(items: Item[]) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({ currentQuestId: 'q1' }),
    },
    quest: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'q1', code: 'QUEST.TEST.1', items }]),
      findUnique: jest
        .fn()
        .mockResolvedValue({ reward: { id: 'r1', xp: 15, points: 20 } }),
    },
    questProgress: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    missionProgress: { findMany: jest.fn().mockResolvedValue([]) },
    challengeProgress: { findMany: jest.fn().mockResolvedValue([]) },
    quizProgress: { findMany: jest.fn().mockResolvedValue([]) },
    foodFactProgress: { findMany: jest.fn().mockResolvedValue([]) },
    userEvent: { findUnique: jest.fn().mockResolvedValue({ id: 'evt-1' }) },
  };
}

describe('QuestProgressService', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let userEventService: { record: jest.Mock };
  let completionRewardService: { awardCompletion: jest.Mock };
  let service: QuestProgressService;

  function build(items: Item[]): QuestProgressService {
    prisma = buildPrisma(items);
    userEventService = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
    };
    completionRewardService = {
      awardCompletion: jest.fn().mockResolvedValue({ xp: 15, points: 20 }),
    };
    return new QuestProgressService(
      prisma as unknown as PrismaService,
      userEventService as unknown as UserEventService,
      completionRewardService as unknown as CompletionRewardService,
      new AfterCommitQueue(),
    );
  }

  describe('scoring', () => {
    it('scores finished over total', async () => {
      service = build([
        MISSION('M.1'),
        MISSION('M.2'),
        QUIZ('Q.1'),
        FOOD_FACT('FF.1'),
      ]);
      prisma.missionProgress.findMany.mockResolvedValue([
        { mission: { code: 'M.1' } },
        { mission: { code: 'M.2' } },
      ]);

      const [outcome] = await service.recomputeForUser('u1');

      expect(outcome.progress).toBe(50);
      expect(outcome.completed).toBe(false);
      expect(prisma.questProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            progress: 50,
            completed: false,
            status: ProgressStatus.IN_PROGRESS,
          }),
        }),
      );
    });

    it('rounds a repeating fraction to two decimals', async () => {
      service = build([MISSION('M.1'), MISSION('M.2'), MISSION('M.3')]);
      prisma.missionProgress.findMany.mockResolvedValue([
        { mission: { code: 'M.1' } },
      ]);

      const [outcome] = await service.recomputeForUser('u1');

      expect(outcome.progress).toBe(33.33);
    });

    it('completes and rewards when every item is finished', async () => {
      service = build([MISSION('M.1'), QUIZ('Q.1')]);
      prisma.missionProgress.findMany.mockResolvedValue([
        { mission: { code: 'M.1' } },
      ]);
      prisma.quizProgress.findMany.mockResolvedValue([
        { quiz: { code: 'Q.1' } },
      ]);

      const [outcome] = await service.recomputeForUser('u1');

      expect(outcome).toMatchObject({
        progress: 100,
        completed: true,
        firstCompletion: true,
      });
      expect(completionRewardService.awardCompletion).toHaveBeenCalledTimes(1);
      expect(completionRewardService.awardCompletion).toHaveBeenCalledWith({
        userId: 'u1',
        sourceType: RewardSourceType.QUEST,
        sourceId: 'q1',
        code: 'QUEST.TEST.1',
        reward: { id: 'r1', xp: 15, points: 20 },
      });
    });

    it('does not re-award a quest that was already complete', async () => {
      service = build([MISSION('M.1')]);
      prisma.missionProgress.findMany.mockResolvedValue([
        { mission: { code: 'M.1' } },
      ]);
      prisma.questProgress.findUnique.mockResolvedValue({
        progress: 100,
        completed: true,
        unlockedAt: new Date(),
      });

      const [outcome] = await service.recomputeForUser('u1');

      expect(outcome.firstCompletion).toBe(false);
      expect(completionRewardService.awardCompletion).not.toHaveBeenCalled();
    });
  });

  describe('per-type completion predicates', () => {
    it('counts a quiz only when passed, not merely answered', async () => {
      service = build([QUIZ('Q.1')]);

      await service.recomputeForUser('u1');

      // `completed` is true for wrong answers too, so isCorrect is the predicate.
      expect(prisma.quizProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'u1', isCorrect: true }),
        }),
      );
    });

    it('counts a food fact on row existence', async () => {
      service = build([FOOD_FACT('FF.1')]);
      prisma.foodFactProgress.findMany.mockResolvedValue([
        { foodFact: { code: 'FF.1' } },
      ]);

      const [outcome] = await service.recomputeForUser('u1');

      // No `completed`/`isCorrect` predicate — FoodFactProgress has neither.
      expect(prisma.foodFactProgress.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', foodFact: { code: { in: ['FF.1'] } } },
        select: { foodFact: { select: { code: true } } },
      });
      expect(outcome.progress).toBe(100);
    });

    it('issues one query per content type, not one per item', async () => {
      service = build([
        MISSION('M.1'),
        MISSION('M.2'),
        MISSION('M.3'),
        QUIZ('Q.1'),
        QUIZ('Q.2'),
      ]);

      await service.recomputeForUser('u1');

      expect(prisma.missionProgress.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.quizProgress.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.challengeProgress.findMany).not.toHaveBeenCalled();
    });
  });

  describe('micro-learning items', () => {
    it('excludes them from the denominator so the quest can still complete', async () => {
      service = build([MISSION('M.1'), MISSION('M.2'), MICRO('ML.1')]);
      prisma.missionProgress.findMany.mockResolvedValue([
        { mission: { code: 'M.1' } },
        { mission: { code: 'M.2' } },
      ]);

      const [outcome] = await service.recomputeForUser('u1');

      expect(outcome.progress).toBe(100);
      expect(outcome.completed).toBe(true);
      expect(prisma.questProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            state: expect.objectContaining({
              total: 2,
              excludedCodes: ['MICRO_LEARNING:ML.1'],
            }),
          }),
        }),
      );
    });

    it('never completes or rewards a quest with nothing scorable', async () => {
      service = build([MICRO('ML.1'), MICRO('ML.2')]);

      const outcomes = await service.recomputeForUser('u1');

      expect(outcomes).toEqual([]);
      expect(prisma.questProgress.upsert).not.toHaveBeenCalled();
      expect(completionRewardService.awardCompletion).not.toHaveBeenCalled();
    });
  });

  describe('events', () => {
    it('emits QUEST_COMPLETED keyed like the PATCH path', async () => {
      service = build([MISSION('M.1')]);
      prisma.missionProgress.findMany.mockResolvedValue([
        { mission: { code: 'M.1' } },
      ]);

      await service.recomputeForUser('u1');

      expect(userEventService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: EventType.QUEST_COMPLETED,
          source: EventSource.QUEST,
          idempotencyKey: 'quest-completed:u1:q1',
        }),
      );
    });

    it('stays silent when a recompute changes nothing', async () => {
      service = build([MISSION('M.1'), MISSION('M.2')]);
      prisma.missionProgress.findMany.mockResolvedValue([
        { mission: { code: 'M.1' } },
      ]);
      prisma.questProgress.findUnique.mockResolvedValue({
        progress: 50,
        completed: false,
        unlockedAt: new Date(),
      });

      await service.recomputeForUser('u1');

      expect(userEventService.record).not.toHaveBeenCalled();
    });
  });

  describe('candidate selection', () => {
    it('skips quests already completed', async () => {
      service = build([MISSION('M.1')]);

      await service.recomputeForUser('u1');

      expect(prisma.questProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', completed: false },
        }),
      );
    });

    it('does nothing when the user has no current quest and no rows', async () => {
      service = build([MISSION('M.1')]);
      prisma.user.findUnique.mockResolvedValue({ currentQuestId: null });

      const outcomes = await service.recomputeForUser('u1');

      expect(outcomes).toEqual([]);
      expect(prisma.quest.findMany).not.toHaveBeenCalled();
    });
  });

  describe('onCompletionEvent', () => {
    it('ignores event types that cannot move a quest', async () => {
      service = build([MISSION('M.1')]);

      service.onCompletionEvent({
        userId: 'u1',
        eventId: 'evt-1',
        eventType: EventType.QUEST_COMPLETED,
      });
      await service.awaitPendingRecomputes();

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('defers the recompute until the trigger event is visible', async () => {
      service = build([MISSION('M.1')]);
      prisma.missionProgress.findMany.mockResolvedValue([
        { mission: { code: 'M.1' } },
      ]);

      service.onCompletionEvent({
        userId: 'u1',
        eventId: 'evt-1',
        eventType: EventType.MISSION_COMPLETED,
      });

      // Returns synchronously; nothing has run on the caller's connection.
      expect(prisma.questProgress.upsert).not.toHaveBeenCalled();

      await service.awaitPendingRecomputes();

      expect(prisma.userEvent.findUnique).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
        select: { id: true },
      });
      expect(prisma.questProgress.upsert).toHaveBeenCalled();
    });

    it('recomputes nothing when the trigger never becomes visible', async () => {
      service = build([MISSION('M.1')]);
      // e.g. the writer's transaction rolled back.
      prisma.userEvent.findUnique.mockResolvedValue(null);

      service.onCompletionEvent({
        userId: 'u1',
        eventId: 'evt-1',
        eventType: EventType.MISSION_COMPLETED,
      });
      await service.awaitPendingRecomputes();

      expect(prisma.questProgress.upsert).not.toHaveBeenCalled();
    }, 15000);
  });
});
