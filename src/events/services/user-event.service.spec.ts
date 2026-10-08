import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EventSource, EventType } from '../event-types';
import { RulesService } from '../../rules/rules.service';
import { QUEST_PROGRESS_RECOMPUTER } from '../../quests/quest-progress.types';
import { UserEventService } from './user-event.service';
import {
  userEventEvaluationFailuresTotal,
  userEventsRecordFailuresTotal,
  userEventsRecordedTotal,
  userEventsReplayedTotal,
} from '../user-event.metrics';
import { metricValue as counterValue } from '../../common/metrics/metric-value.testing';

describe('UserEventService', () => {
  let service: UserEventService;
  let prisma: {
    userEvent: { findUnique: jest.Mock; create: jest.Mock };
  };
  let rulesService: {
    evaluateUserEvent: jest.Mock;
  };
  let questRecomputer: { onCompletionEvent: jest.Mock };

  beforeEach(async () => {
    prisma = {
      userEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    rulesService = {
      evaluateUserEvent: jest.fn().mockResolvedValue(undefined),
    };
    questRecomputer = { onCompletionEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserEventService,
        { provide: PrismaService, useValue: prisma },
        { provide: RulesService, useValue: rulesService },
        { provide: QUEST_PROGRESS_RECOMPUTER, useValue: questRecomputer },
      ],
    }).compile();

    service = module.get(UserEventService);
  });

  it('records a new event', async () => {
    prisma.userEvent.findUnique.mockResolvedValue(null);
    prisma.userEvent.create.mockResolvedValue({
      id: 'evt-1',
      userId: 'u1',
      eventType: EventType.ONBOARDING_COMPLETED,
      source: EventSource.ONBOARDING,
    });

    const result = await service.record({
      userId: 'u1',
      eventType: EventType.ONBOARDING_COMPLETED,
      source: EventSource.ONBOARDING,
      metadata: { segment: 'BEGINNER' },
      subject: { type: 'USER', id: 'u1' },
    });

    expect(result.replayed).toBe(false);
    expect(prisma.userEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: EventSource.ONBOARDING,
          metadata: expect.objectContaining({
            segment: 'BEGINNER',
            subject: { type: 'USER', id: 'u1' },
          }),
        }),
      }),
    );
    expect(rulesService.evaluateUserEvent).toHaveBeenCalledWith(
      'u1',
      EventType.ONBOARDING_COMPLETED,
      undefined,
    );
  });

  it('stamps a server-owned UTC dayBucket, overriding any client value', async () => {
    jest.useFakeTimers({ now: new Date('2026-09-29T23:30:00.000Z') });
    try {
      prisma.userEvent.findUnique.mockResolvedValue(null);
      prisma.userEvent.create.mockResolvedValue({
        id: 'evt-1',
        userId: 'u1',
        eventType: EventType.FOOD_WASTE_HALF_PLATE_SAVED,
        source: EventSource.QUICK_ACTION,
      });

      await service.record({
        userId: 'u1',
        eventType: EventType.FOOD_WASTE_HALF_PLATE_SAVED,
        source: EventSource.QUICK_ACTION,
        metadata: { dayBucket: '1999-01-01' },
      });

      expect(prisma.userEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({ dayBucket: '2026-09-29' }),
          }),
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('counts fresh writes and replays in separate counters', async () => {
    const labels = {
      event_type: EventType.ONBOARDING_COMPLETED,
      source: EventSource.ONBOARDING,
    };
    const recordedBefore = await counterValue(userEventsRecordedTotal, labels);
    const replayedBefore = await counterValue(userEventsReplayedTotal, labels);

    prisma.userEvent.findUnique.mockResolvedValueOnce(null);
    prisma.userEvent.create.mockResolvedValue({
      id: 'evt-1',
      userId: 'u1',
      eventType: labels.event_type,
      source: labels.source,
    });
    await service.record({
      userId: 'u1',
      eventType: labels.event_type,
      source: labels.source,
      idempotencyKey: 'k1',
    });

    prisma.userEvent.findUnique.mockResolvedValueOnce({ id: 'evt-1' });
    await service.record({
      userId: 'u1',
      eventType: labels.event_type,
      source: labels.source,
      idempotencyKey: 'k1',
    });

    expect(await counterValue(userEventsRecordedTotal, labels)).toBe(
      recordedBefore + 1,
    );
    expect(await counterValue(userEventsReplayedTotal, labels)).toBe(
      replayedBefore + 1,
    );
  });

  it('counts dropped best-effort writes', async () => {
    const labels = { event_type: EventType.APP_SESSION_OPENED };
    const before = await counterValue(userEventsRecordFailuresTotal, labels);
    prisma.userEvent.create.mockRejectedValue(new Error('db down'));

    await service.recordBestEffort({
      userId: 'u1',
      eventType: EventType.APP_SESSION_OPENED,
      source: EventSource.API,
    });

    expect(await counterValue(userEventsRecordFailuresTotal, labels)).toBe(
      before + 1,
    );
  });

  it('counts failed rule evaluations without failing the write', async () => {
    const labels = { stage: 'rules', event_type: EventType.MEAL_LOGGED };
    const before = await counterValue(userEventEvaluationFailuresTotal, labels);
    prisma.userEvent.create.mockResolvedValue({
      id: 'evt-1',
      userId: 'u1',
      eventType: EventType.MEAL_LOGGED,
      source: EventSource.API,
    });
    rulesService.evaluateUserEvent.mockRejectedValue(new Error('boom'));

    const result = await service.record(
      {
        userId: 'u1',
        eventType: EventType.MEAL_LOGGED,
        source: EventSource.API,
      },
      prisma as unknown as Prisma.TransactionClient,
    );

    expect(result.replayed).toBe(false);
    expect(await counterValue(userEventEvaluationFailuresTotal, labels)).toBe(
      before + 1,
    );
  });

  it('replays on idempotencyKey', async () => {
    prisma.userEvent.findUnique.mockResolvedValue({ id: 'evt-existing' });

    const result = await service.record({
      userId: 'u1',
      eventType: EventType.WALLET_POINTS_AWARDED,
      source: EventSource.WALLET,
      idempotencyKey: 'key-1',
    });

    expect(result.replayed).toBe(true);
    expect(prisma.userEvent.create).not.toHaveBeenCalled();
    expect(rulesService.evaluateUserEvent).not.toHaveBeenCalled();
  });

  it('replays on P2002 race', async () => {
    prisma.userEvent.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'evt-race' });
    prisma.userEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.record({
      userId: 'u1',
      eventType: EventType.WALLET_POINTS_AWARDED,
      source: EventSource.WALLET,
      idempotencyKey: 'key-race',
    });

    expect(result.replayed).toBe(true);
    expect(result.event.id).toBe('evt-race');
    expect(rulesService.evaluateUserEvent).not.toHaveBeenCalled();
  });

  // Rule completions credit the wallet, and the wallet records WALLET_* events
  // through this service. Without this guard that loop is infinite, so pin it.
  it.each([
    EventType.WALLET_XP_AWARDED,
    EventType.MISSION_COMPLETED,
    EventType.CHALLENGE_COMPLETED,
  ])('does not re-enter the evaluator for %s', async (eventType) => {
    prisma.userEvent.findUnique.mockResolvedValue(null);
    prisma.userEvent.create.mockResolvedValue({
      id: 'evt-loop',
      userId: 'u1',
      eventType,
      source: EventSource.WALLET,
    });

    await service.record({
      userId: 'u1',
      eventType,
      source: EventSource.WALLET,
    });

    expect(prisma.userEvent.create).toHaveBeenCalled();
    expect(rulesService.evaluateUserEvent).not.toHaveBeenCalled();
  });

  it('hands a fresh completion event to the quest recomputer', async () => {
    prisma.userEvent.findUnique.mockResolvedValue(null);
    prisma.userEvent.create.mockResolvedValue({
      id: 'evt-quest',
      userId: 'u1',
      eventType: EventType.MISSION_COMPLETED,
      source: EventSource.MISSION,
    });

    await service.record({
      userId: 'u1',
      eventType: EventType.MISSION_COMPLETED,
      source: EventSource.MISSION,
    });

    expect(questRecomputer.onCompletionEvent).toHaveBeenCalledWith({
      userId: 'u1',
      eventId: 'evt-quest',
      eventType: EventType.MISSION_COMPLETED,
    });
  });

  // A replayed event means an earlier call already triggered the recompute, so
  // the completion must count exactly once.
  it('does not re-trigger the quest recomputer for a replayed event', async () => {
    prisma.userEvent.findUnique.mockResolvedValue({ id: 'evt-existing' });

    await service.record({
      userId: 'u1',
      eventType: EventType.MISSION_COMPLETED,
      source: EventSource.MISSION,
      idempotencyKey: 'mission-completed:u1:m1',
    });

    expect(questRecomputer.onCompletionEvent).not.toHaveBeenCalled();
  });

  it('awaits derived progress evaluation when called with a transaction client', async () => {
    const tx = {
      userEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'evt-tx',
          userId: 'u1',
          eventType: EventType.ONBOARDING_COMPLETED,
          source: EventSource.ONBOARDING,
        }),
      },
    } as unknown as Prisma.TransactionClient;

    await service.record(
      {
        userId: 'u1',
        eventType: EventType.ONBOARDING_COMPLETED,
        source: EventSource.ONBOARDING,
      },
      tx,
    );

    expect(rulesService.evaluateUserEvent).toHaveBeenCalledWith(
      'u1',
      EventType.ONBOARDING_COMPLETED,
      tx,
    );
  });
});
