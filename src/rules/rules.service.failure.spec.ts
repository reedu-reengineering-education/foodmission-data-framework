import { ModuleRef } from '@nestjs/core';
import { AfterCommitQueue } from '../common/after-commit/after-commit.queue';
import { PrismaService } from '../database/prisma.service';
import { EventType } from '../events/event-types';
import {
  USER_EVENT_RECORDER,
  UserEventRecorder,
} from '../events/user-event-recorder.types';
import { CompletionRewardAwarder } from '../gamification/completion-reward.types';
import { RulesCoverageDoc } from './rule-schema';
import { RulesService } from './rules.service';
import { RulesDeadlineScheduler } from './rules-deadline.scheduler';

const DAY = 24 * 60 * 60 * 1000;

/** One challenge: log 3 meals within 7 days of starting it. */
const RULES = {
  schemaVersion: 1,
  status: 'draft',
  purpose: 'test',
  ruleTemplate: {
    window: { type: 'since_start', days: 7 },
    counters: {},
    target: '1',
    progress: '1',
    notes: [],
  },
  missions: [],
  challenges: [
    {
      code: 'CH.A1.1',
      shape: 'count_at_least',
      rule: {
        window: { type: 'since_start', days: 7 },
        counters: { logged: { event: 'MEAL_LOGGED' } },
        target: 'logged >= 3',
        progress: 'min(logged / 3, 1)',
        notes: [],
      },
    },
  ],
} as unknown as RulesCoverageDoc;

function buildDb() {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        currentQuest: {
          items: [{ contentType: 'CHALLENGE', contentCode: 'CH.A1.1' }],
        },
      }),
    },
    userEvent: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    mission: { findMany: jest.fn().mockResolvedValue([]) },
    challenge: {
      findMany: jest.fn().mockResolvedValue([{ id: 'c1', code: 'CH.A1.1' }]),
      findUnique: jest.fn(),
    },
    missionProgress: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
    challengeProgress: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
}

describe('RulesService failure', () => {
  let prisma: ReturnType<typeof buildDb>;
  let awarder: jest.Mocked<CompletionRewardAwarder>;
  let recorder: jest.Mocked<UserEventRecorder>;
  let service: RulesService;

  beforeEach(() => {
    prisma = buildDb();
    awarder = { awardCompletion: jest.fn() };
    recorder = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
    };
    service = new RulesService(
      prisma as unknown as PrismaService,
      {
        get: jest.fn((token: unknown) =>
          token === USER_EVENT_RECORDER ? recorder : awarder,
        ),
      } as unknown as ModuleRef,
      new AfterCommitQueue(),
    );
    (service as unknown as { loadedRules: RulesCoverageDoc }).loadedRules =
      RULES;
  });

  it('fails a challenge whose window ended without the target, once and without a reward', async () => {
    const startedAt = new Date(Date.now() - 8 * DAY);
    prisma.challengeProgress.findMany.mockResolvedValue([
      { challengeId: 'c1', status: 'IN_PROGRESS', startedAt },
    ]);
    prisma.challengeProgress.findUnique.mockResolvedValue({
      progress: 33,
      completed: false,
      startedAt,
    });
    prisma.userEvent.findMany.mockResolvedValue([
      {
        eventType: 'MEAL_LOGGED',
        createdAt: new Date(startedAt.getTime() + DAY),
        metadata: {},
      },
    ]);

    await service.evaluateUser('u1');
    await service.awaitPendingAwards();

    expect(prisma.challengeProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: 'FAILED',
          completed: false,
          startedAt,
        }),
      }),
    );
    const failedEvents = recorder.record.mock.calls.filter(
      ([input]) => input.eventType === EventType.CHALLENGE_FAILED,
    );
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0][0].idempotencyKey).toBe(
      `challenge-failed:u1:c1:${startedAt.getTime()}`,
    );
    expect(awarder.awardCompletion).not.toHaveBeenCalled();
  });

  it('reaches back to the start of an open item when loading events', async () => {
    const startedAt = new Date(Date.now() - 20 * DAY);
    prisma.challengeProgress.findMany.mockResolvedValue([
      { challengeId: 'c1', status: 'IN_PROGRESS', startedAt },
    ]);

    await service.evaluateUser('u1');

    const since = prisma.userEvent.findMany.mock.calls[0][0].where.createdAt
      .gte as Date;
    // The widest window (7 calendar days) before the start, for before_start
    // counters.
    const expected = new Date(startedAt);
    expected.setDate(expected.getDate() - 7);
    expect(since.getTime()).toBe(expected.getTime());
  });

  it.each(['FAILED', 'COMPLETED'])(
    'leaves a %s challenge alone',
    async (status) => {
      prisma.challengeProgress.findMany.mockResolvedValue([
        { challengeId: 'c1', status, startedAt: new Date() },
      ]);

      await service.evaluateUser('u1');

      expect(prisma.challengeProgress.upsert).not.toHaveBeenCalled();
      expect(recorder.record).not.toHaveBeenCalled();
    },
  );

  it('finds users with an open, started item past its rule deadline', async () => {
    const now = new Date('2026-10-02T12:00:00.000Z');
    prisma.challengeProgress.findMany.mockResolvedValue([{ userId: 'u1' }]);

    const userIds = await service.findUsersWithExpiredItems(now);

    expect(userIds).toEqual(['u1']);
    expect(prisma.challengeProgress.findMany).toHaveBeenCalledWith({
      where: {
        challengeId: { in: ['c1'] },
        status: { notIn: ['COMPLETED', 'FAILED'] },
        startedAt: { not: null, lte: new Date(now.getTime() - 7 * DAY) },
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    // No mission has a rule here, so missions aren't queried.
    expect(prisma.missionProgress.findMany).not.toHaveBeenCalled();
  });
});

describe('RulesDeadlineScheduler', () => {
  it('re-evaluates each expired user and keeps going after a failure', async () => {
    const rulesService = {
      findUsersWithExpiredItems: jest.fn().mockResolvedValue(['u1', 'u2']),
      evaluateUser: jest
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(undefined),
    };
    const scheduler = new RulesDeadlineScheduler(
      rulesService as unknown as RulesService,
    );

    await scheduler.resolveExpiredItems();

    expect(rulesService.evaluateUser).toHaveBeenNthCalledWith(1, 'u1');
    expect(rulesService.evaluateUser).toHaveBeenNthCalledWith(2, 'u2');
  });
});
