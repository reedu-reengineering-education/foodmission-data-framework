import { ModuleRef } from '@nestjs/core';
import { AfterCommitQueue } from '../common/after-commit/after-commit.queue';
import { Prisma, RewardSourceType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EventSource, EventType } from '../events/event-types';
import {
  USER_EVENT_RECORDER,
  UserEventRecorder,
} from '../events/user-event-recorder.types';
import { CompletionRewardAwarder } from '../gamification/completion-reward.types';
import { RulesCoverageDoc } from './rule-schema';
import { RulesService } from './rules.service';

/** Minimal rule doc: one challenge that completes on a single MEAL_LOGGED. */
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
      shape: 'one_shot_event',
      rule: {
        window: { type: 'since_start', days: 7 },
        counters: { logged: { event: 'MEAL_LOGGED' } },
        target: 'logged >= 1',
        progress: 'clamp(logged, 0, 1)',
        notes: [],
      },
    },
  ],
} as unknown as RulesCoverageDoc;

type MockDb = {
  user: { findUnique: jest.Mock };
  userEvent: { findMany: jest.Mock; create: jest.Mock };
  mission: { findMany: jest.Mock; findUnique: jest.Mock };
  challenge: { findMany: jest.Mock; findUnique: jest.Mock };
  missionProgress: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
  challengeProgress: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
};

function buildDb(): MockDb {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        currentQuest: {
          items: [{ contentType: 'CHALLENGE', contentCode: 'CH.A1.1' }],
        },
      }),
    },
    userEvent: {
      findMany: jest.fn().mockResolvedValue([
        {
          eventType: 'MEAL_LOGGED',
          createdAt: new Date(),
          metadata: { mealId: 'meal-1' },
        },
      ]),
      create: jest.fn().mockResolvedValue({}),
    },
    mission: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
    challenge: {
      findMany: jest.fn().mockResolvedValue([{ id: 'c1', code: 'CH.A1.1' }]),
      findUnique: jest
        .fn()
        .mockResolvedValue({ reward: { id: 'r1', xp: 15, points: 20 } }),
    },
    missionProgress: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    challengeProgress: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
}

describe('RulesService completion rewards', () => {
  let prisma: MockDb;
  let completionRewardService: jest.Mocked<CompletionRewardAwarder>;
  let userEventService: jest.Mocked<UserEventRecorder>;
  let service: RulesService;

  beforeEach(() => {
    prisma = buildDb();
    completionRewardService = {
      awardCompletion: jest.fn().mockResolvedValue({ xp: 15, points: 20 }),
    };
    userEventService = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
    };
    service = new RulesService(
      prisma as unknown as PrismaService,
      {
        get: jest.fn((token: unknown) =>
          token === USER_EVENT_RECORDER
            ? userEventService
            : completionRewardService,
        ),
      } as unknown as ModuleRef,
      new AfterCommitQueue(),
    );
    // Bypass the YAML draft on disk; this suite is about the award path.
    (service as unknown as { loadedRules: RulesCoverageDoc }).loadedRules =
      RULES;
  });

  it('awards the reward when a rule first completes a challenge', async () => {
    // First lookup is the pre-update read in syncProgress, second is the
    // post-write confirmation in the award drain.
    prisma.challengeProgress.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ completed: true });

    await service.evaluateUserEvent('u1', 'MEAL_LOGGED');

    expect(prisma.challengeProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ progress: 100, completed: true }),
      }),
    );
    expect(completionRewardService.awardCompletion).toHaveBeenCalledTimes(1);
    expect(completionRewardService.awardCompletion).toHaveBeenCalledWith({
      userId: 'u1',
      sourceType: RewardSourceType.CHALLENGE,
      sourceId: 'c1',
      code: 'CH.A1.1',
      reward: { id: 'r1', xp: 15, points: 20 },
    });
  });

  // Regression: emitDerivedEvent used to call userEvent.create directly, which
  // produced rows with no idempotency key (so a rule-completed challenge that
  // was then PATCHed logged CHALLENGE_COMPLETED twice) and spelled `source` as
  // 'CHALLENGE' where every other emitter writes 'challenge'.
  it('records derived events through the ledger writer, keyed like the API path', async () => {
    prisma.challengeProgress.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ completed: true });

    await service.evaluateUserEvent('u1', 'MEAL_LOGGED');

    expect(prisma.userEvent.create).not.toHaveBeenCalled();
    expect(userEventService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: EventType.CHALLENGE_COMPLETED,
        source: EventSource.CHALLENGE,
        idempotencyKey: 'challenge-completed:u1:c1',
      }),
      expect.anything(),
    );
  });

  it('forwards the caller transaction to the ledger writer', async () => {
    const tx = buildDb();
    prisma.challengeProgress.findUnique.mockResolvedValue({ completed: true });

    await service.evaluateUserEvent(
      'u1',
      'MEAL_LOGGED',
      tx as unknown as Prisma.TransactionClient,
    );

    expect(userEventService.record).toHaveBeenCalledWith(expect.anything(), tx);
  });

  it('reads the reward fresh rather than from the cached catalog', async () => {
    prisma.challengeProgress.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ completed: true });

    await service.evaluateUserEvent('u1', 'MEAL_LOGGED');

    // The catalog select must not carry reward amounts that could go stale.
    expect(prisma.challenge.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, code: true } }),
    );
    expect(prisma.challenge.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' } }),
    );
  });

  it('does not award again for an already-completed challenge', async () => {
    prisma.challengeProgress.findMany.mockResolvedValue([
      { challengeId: 'c1' },
    ]);

    await service.evaluateUserEvent('u1', 'MEAL_LOGGED');

    expect(prisma.challengeProgress.upsert).not.toHaveBeenCalled();
    expect(completionRewardService.awardCompletion).not.toHaveBeenCalled();
  });

  it('does not award when the completion cannot be confirmed', async () => {
    // e.g. the surrounding transaction rolled back after the rule fired.
    prisma.challengeProgress.findUnique.mockResolvedValue(null);

    await service.evaluateUserEvent('u1', 'MEAL_LOGGED');

    expect(completionRewardService.awardCompletion).not.toHaveBeenCalled();
  });

  it('never awards on the caller transaction, and defers until it commits', async () => {
    const tx = buildDb();
    // The progress row is written on the transaction and is not visible on the
    // base client until commit.
    prisma.challengeProgress.findUnique.mockResolvedValue({ completed: true });

    await service.evaluateUserEvent(
      'u1',
      'MEAL_LOGGED',
      tx as unknown as Prisma.TransactionClient,
    );

    expect(tx.challengeProgress.upsert).toHaveBeenCalled();
    expect(prisma.challengeProgress.upsert).not.toHaveBeenCalled();
    // Not paid yet: the caller's transaction is still open at this point.
    expect(completionRewardService.awardCompletion).not.toHaveBeenCalled();

    await service.awaitPendingAwards();

    expect(completionRewardService.awardCompletion).toHaveBeenCalledTimes(1);
    // Confirmation and reward lookup both went to the base client.
    expect(prisma.challengeProgress.findUnique).toHaveBeenCalled();
    expect(prisma.challenge.findUnique).toHaveBeenCalled();
    expect(tx.challenge.findUnique).not.toHaveBeenCalled();
  });

  it('keeps a failing award from breaking evaluation', async () => {
    prisma.challengeProgress.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ completed: true });
    completionRewardService.awardCompletion.mockRejectedValue(
      new Error('wallet down'),
    );

    await expect(
      service.evaluateUserEvent('u1', 'MEAL_LOGGED'),
    ).resolves.toBeUndefined();
  });
});
