import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, UserSegment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GamificationEventType } from '../gamification.constants';
import {
  GamificationOnboardingService,
  onboardingCompletedIdempotencyKey,
} from './gamification-onboarding.service';

describe('GamificationOnboardingService', () => {
  let service: GamificationOnboardingService;
  let prisma: {
    gamificationEvent: { findUnique: jest.Mock; create: jest.Mock };
    userGamificationWallet: { upsert: jest.Mock };
    progressIndicator: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      gamificationEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      userGamificationWallet: { upsert: jest.fn() },
      progressIndicator: { upsert: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationOnboardingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(GamificationOnboardingService);
  });

  it('skips when ONBOARDING_COMPLETED already exists', async () => {
    prisma.gamificationEvent.findUnique.mockResolvedValue({
      id: 'evt-1',
      idempotencyKey: onboardingCompletedIdempotencyKey('u1'),
    });

    const result = await service.applyOnboardingSideEffects(
      { id: 'u1' },
      UserSegment.BEGINNER,
    );

    expect(result.skipped).toBe(true);
    expect(result.onboardingEventRecorded).toBe(false);
    expect(result.indicatorsSeeded).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('runs wallet, indicators, and event in one transaction', async () => {
    prisma.gamificationEvent.findUnique.mockResolvedValue(null);

    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        const tx = {
          gamificationEvent: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'evt-new' }),
          },
          userGamificationWallet: {
            upsert: jest.fn().mockResolvedValue({ userId: 'u1' }),
          },
          progressIndicator: {
            upsert: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(tx as unknown as typeof prisma);
      },
    );

    const result = await service.applyOnboardingSideEffects(
      { id: 'u1' },
      UserSegment.INTERMEDIATE,
    );

    expect(result.skipped).toBe(false);
    expect(result.onboardingEventRecorded).toBe(true);
    expect(result.walletEnsured).toBe(true);
    expect(result.indicatorsSeeded).toBe(7);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('treats concurrent P2002 as skipped', async () => {
    prisma.gamificationEvent.findUnique.mockResolvedValue(null);
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

  it('writes ONBOARDING_COMPLETED with stable idempotency key', async () => {
    prisma.gamificationEvent.findUnique.mockResolvedValue(null);

    let createdPayload: Record<string, unknown> | undefined;
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        const tx = {
          gamificationEvent: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(({ data }) => {
              createdPayload = data;
              return { id: 'evt-new' };
            }),
          },
          userGamificationWallet: {
            upsert: jest.fn().mockResolvedValue({}),
          },
          progressIndicator: {
            upsert: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(tx as unknown as typeof prisma);
      },
    );

    await service.applyOnboardingSideEffects(
      { id: 'u1' },
      UserSegment.BEGINNER,
    );

    expect(createdPayload).toMatchObject({
      userId: 'u1',
      eventType: GamificationEventType.ONBOARDING_COMPLETED,
      idempotencyKey: 'onboarding-completed:u1',
    });
  });
});
