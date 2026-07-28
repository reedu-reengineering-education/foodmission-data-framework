import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, UserSegment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EventSource, EventType } from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';
import {
  GamificationOnboardingService,
  onboardingCompletedIdempotencyKey,
} from './gamification-onboarding.service';

describe('GamificationOnboardingService', () => {
  let service: GamificationOnboardingService;
  let userEventService: jest.Mocked<
    Pick<UserEventService, 'findByIdempotencyKey' | 'record'>
  >;
  let prisma: {
    userGamificationWallet: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    userEventService = {
      findByIdempotencyKey: jest.fn(),
      record: jest.fn(),
    };

    prisma = {
      userGamificationWallet: { upsert: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationOnboardingService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserEventService, useValue: userEventService },
      ],
    }).compile();

    service = module.get(GamificationOnboardingService);
  });

  it('skips when ONBOARDING_COMPLETED already exists', async () => {
    userEventService.findByIdempotencyKey.mockResolvedValue({
      id: 'evt-1',
      idempotencyKey: onboardingCompletedIdempotencyKey('u1'),
    } as any);

    const result = await service.applyOnboardingSideEffects(
      { id: 'u1' },
      UserSegment.BEGINNER,
    );

    expect(result.skipped).toBe(true);
    expect(result.onboardingEventRecorded).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('runs wallet ensure and event in one transaction', async () => {
    userEventService.findByIdempotencyKey.mockResolvedValue(null);
    userEventService.record.mockResolvedValue({
      event: { id: 'evt-new' } as any,
      replayed: false,
    });

    prisma.$transaction.mockImplementation(
      async (fn: (tx: any) => Promise<unknown>) => {
        const tx = {
          userGamificationWallet: {
            upsert: jest.fn().mockResolvedValue({ userId: 'u1' }),
          },
        };
        return fn(tx);
      },
    );

    const result = await service.applyOnboardingSideEffects(
      { id: 'u1' },
      UserSegment.INTERMEDIATE,
    );

    expect(result.skipped).toBe(false);
    expect(result.onboardingEventRecorded).toBe(true);
    expect(result.walletEnsured).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(userEventService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        eventType: EventType.ONBOARDING_COMPLETED,
        source: EventSource.ONBOARDING,
        idempotencyKey: 'onboarding-completed:u1',
        metadata: { segment: UserSegment.INTERMEDIATE },
      }),
      expect.anything(),
    );
  });

  it('treats concurrent P2002 as skipped', async () => {
    userEventService.findByIdempotencyKey.mockResolvedValue(null);
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.applyOnboardingSideEffects(
      { id: 'u1' },
      UserSegment.ADVANCED,
    );

    expect(result.skipped).toBe(true);
    expect(result.onboardingEventRecorded).toBe(false);
  });
});
