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

/** One mission that completes on a single MEAL_LOGGED. */
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
  missions: [
    {
      code: 'M.A1.1',
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
  challenges: [],
} as unknown as RulesCoverageDoc;

const STARTED_AT = new Date(Date.now() - 60 * 60 * 1000);

function buildDb() {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        currentQuest: {
          items: [{ contentType: 'MISSION', contentCode: 'M.A1.1' }],
        },
      }),
    },
    userEvent: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { eventType: 'MEAL_LOGGED', createdAt: new Date(), metadata: {} },
        ]),
    },
    mission: {
      findMany: jest.fn().mockResolvedValue([{ id: 'm1', code: 'M.A1.1' }]),
      findUnique: jest.fn().mockResolvedValue({ reward: null }),
    },
    challenge: { findMany: jest.fn().mockResolvedValue([]) },
    missionProgress: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    challengeProgress: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };
}

describe('RulesService missions need an explicit start', () => {
  let prisma: ReturnType<typeof buildDb>;
  let recorder: jest.Mocked<UserEventRecorder>;
  let service: RulesService;

  beforeEach(() => {
    prisma = buildDb();
    recorder = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
    };
    const awarder: jest.Mocked<CompletionRewardAwarder> = {
      awardCompletion: jest.fn().mockResolvedValue({ xp: 0, points: 0 }),
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

  it('leaves a mission the user has not started alone', async () => {
    await service.evaluateUserEvent('u1', 'MEAL_LOGGED');

    // Nothing to score, so not even the events are read.
    expect(prisma.userEvent.findMany).not.toHaveBeenCalled();
    expect(prisma.missionProgress.upsert).not.toHaveBeenCalled();
    expect(prisma.missionProgress.updateMany).not.toHaveBeenCalled();
    expect(recorder.record).not.toHaveBeenCalled();
  });

  it('scores a started mission without ever creating its row', async () => {
    prisma.missionProgress.findMany.mockResolvedValue([
      { missionId: 'm1', status: 'NOT_STARTED', startedAt: STARTED_AT },
    ]);
    prisma.missionProgress.findUnique
      .mockResolvedValueOnce({
        progress: 0,
        completed: false,
        startedAt: STARTED_AT,
      })
      .mockResolvedValue({ completed: true });

    await service.evaluateUserEvent('u1', 'MEAL_LOGGED');
    await service.awaitPendingAwards();

    expect(prisma.missionProgress.upsert).not.toHaveBeenCalled();
    expect(prisma.missionProgress.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', missionId: 'm1' },
      data: expect.objectContaining({
        progress: 100,
        completed: true,
        startedAt: STARTED_AT,
      }),
    });
    expect(recorder.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: EventType.MISSION_COMPLETED }),
      expect.anything(),
    );
  });

  it('records nothing when the mission was removed while being scored', async () => {
    prisma.missionProgress.findMany.mockResolvedValue([
      { missionId: 'm1', status: 'NOT_STARTED', startedAt: STARTED_AT },
    ]);
    prisma.missionProgress.findUnique.mockResolvedValueOnce({
      progress: 0,
      completed: false,
      startedAt: STARTED_AT,
    });
    prisma.missionProgress.updateMany.mockResolvedValue({ count: 0 });

    await service.evaluateUserEvent('u1', 'MEAL_LOGGED');

    expect(recorder.record).not.toHaveBeenCalled();
  });

  it('scores a mission against the inputs the user set on start', async () => {
    (service as unknown as { loadedRules: RulesCoverageDoc }).loadedRules = {
      ...RULES,
      missions: [
        {
          code: 'M.A1.1',
          shape: 'count_at_least',
          rule: {
            window: { type: 'since_start', days: 7 },
            inputs: { goal: { type: 'integer', min: 1, max: 10 } },
            counters: { logged: { event: 'MEAL_LOGGED' } },
            target: 'logged >= goal',
            progress: 'min(logged / goal, 1)',
            notes: [],
          },
        },
      ],
    } as unknown as RulesCoverageDoc;
    prisma.missionProgress.findMany.mockResolvedValue([
      { missionId: 'm1', status: 'NOT_STARTED', startedAt: STARTED_AT },
    ]);
    prisma.missionProgress.findUnique.mockResolvedValue({
      progress: 0,
      completed: false,
      startedAt: STARTED_AT,
      inputs: { goal: 2 },
    });
    prisma.userEvent.findMany.mockResolvedValue([
      { eventType: 'MEAL_LOGGED', createdAt: new Date(), metadata: {} },
    ]);

    await service.evaluateUserEvent('u1', 'MEAL_LOGGED');

    expect(prisma.missionProgress.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ inputs: true }),
      }),
    );
    // One of the two meals the user set as their goal.
    expect(prisma.missionProgress.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', missionId: 'm1' },
      data: expect.objectContaining({ progress: 50, completed: false }),
    });
  });

  it('keeps a started mission IN_PROGRESS while it has no progress yet', async () => {
    prisma.missionProgress.findMany.mockResolvedValue([
      { missionId: 'm1', status: 'IN_PROGRESS', startedAt: STARTED_AT },
    ]);
    prisma.missionProgress.findUnique.mockResolvedValue({
      progress: 0,
      completed: false,
      startedAt: STARTED_AT,
    });
    prisma.userEvent.findMany.mockResolvedValue([]);

    await service.evaluateUserEvent('u1', 'MEAL_LOGGED');

    expect(prisma.missionProgress.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', missionId: 'm1' },
      data: expect.objectContaining({ progress: 0, status: 'IN_PROGRESS' }),
    });
  });
});
