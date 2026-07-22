import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Prisma, WalletCurrency } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UserEventService } from '../../events/services/user-event.service';
import { levelFromXp } from '../gamification.constants';
import { GamificationWalletService } from './gamification-wallet.service';

describe('levelFromXp', () => {
  it('starts at level 1', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
  });

  it('increments every 100 XP', () => {
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(250)).toBe(3);
  });
});

describe('GamificationWalletService', () => {
  let service: GamificationWalletService;
  let userEventService: jest.Mocked<Pick<UserEventService, 'findByIdempotencyKey' | 'record'>>;
  let prisma: {
    userEvent: { findUniqueOrThrow: jest.Mock };
    userGamificationWallet: {
      upsert: jest.Mock;
      update: jest.Mock;
    };
    walletEntry: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    userEventService = {
      findByIdempotencyKey: jest.fn(),
      record: jest.fn(),
    };

    prisma = {
      userEvent: {
        findUniqueOrThrow: jest.fn(),
      },
      userGamificationWallet: {
        upsert: jest.fn(),
        update: jest.fn(),
      },
      walletEntry: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationWalletService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserEventService, useValue: userEventService },
      ],
    }).compile();

    service = module.get(GamificationWalletService);
  });

  it('replays award when idempotencyKey already exists', async () => {
    const existingEvent = {
      id: 'evt-1',
      idempotencyKey: 'award-1',
      walletEntries: [
        {
          id: 'we-1',
          userId: 'u1',
          currency: WalletCurrency.POINTS,
          amount: 25,
          balanceAfter: 25,
          reason: 'challenge',
          eventId: 'evt-1',
          createdAt: new Date(),
        },
      ],
    };
    userEventService.findByIdempotencyKey.mockResolvedValue(existingEvent as any);
    prisma.userGamificationWallet.upsert.mockResolvedValue({
      userId: 'u1',
      level: 1,
      xp: 0,
      points: 25,
      updatedAt: new Date(),
    });

    const result = await service.award({
      userId: 'u1',
      currency: WalletCurrency.POINTS,
      amount: 25,
      reason: 'challenge',
      idempotencyKey: 'award-1',
    });

    expect(result.replayed).toBe(true);
    expect(result.entry.id).toBe('we-1');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('writes event, wallet entry, and updates balances in a transaction', async () => {
    userEventService.findByIdempotencyKey.mockResolvedValue(null);

    const createdEvent = {
      id: 'evt-2',
      userId: 'u1',
      eventType: 'POINTS_AWARDED',
    };
    const createdEntry = {
      id: 'we-2',
      userId: 'u1',
      currency: WalletCurrency.POINTS,
      amount: 10,
      balanceAfter: 10,
      reason: 'mission',
      eventId: 'evt-2',
    };
    const updatedWallet = {
      userId: 'u1',
      level: 1,
      xp: 0,
      points: 10,
      updatedAt: new Date(),
    };

    userEventService.record.mockResolvedValue({
      event: createdEvent as any,
      replayed: false,
    });

    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        const tx = {
          userEvent: {
            findUniqueOrThrow: jest.fn(),
          },
          userGamificationWallet: {
            upsert: jest.fn().mockResolvedValue({
              userId: 'u1',
              level: 1,
              xp: 0,
              points: 0,
              updatedAt: new Date(),
            }),
            update: jest.fn().mockResolvedValue(updatedWallet),
          },
          walletEntry: {
            create: jest.fn().mockResolvedValue(createdEntry),
          },
          $queryRaw: jest.fn().mockResolvedValue([
            {
              userId: 'u1',
              level: 1,
              xp: 0,
              points: 0,
              updatedAt: new Date(),
            },
          ]),
        };
        return fn(tx as unknown as typeof prisma);
      },
    );

    const result = await service.award({
      userId: 'u1',
      currency: WalletCurrency.POINTS,
      amount: 10,
      reason: 'mission',
      eventType: 'POINTS_AWARDED',
      idempotencyKey: 'award-2',
    });

    expect(result.replayed).toBe(false);
    expect(result.wallet.points).toBe(10);
    expect(result.entry.balanceAfter).toBe(10);
    expect(result.event?.id).toBe('evt-2');
    expect(userEventService.record).toHaveBeenCalled();
  });

  it('rejects zero amount', async () => {
    await expect(
      service.award({
        userId: 'u1',
        currency: WalletCurrency.XP,
        amount: 0,
        reason: 'noop',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replays award when create races on idempotencyKey (P2002)', async () => {
    userEventService.findByIdempotencyKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'evt-race',
        idempotencyKey: 'award-race',
        walletEntries: [
          {
            id: 'we-race',
            currency: WalletCurrency.POINTS,
            amount: 5,
          },
        ],
      } as any);
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    prisma.userGamificationWallet.upsert.mockResolvedValue({
      userId: 'u1',
      level: 1,
      xp: 0,
      points: 5,
      updatedAt: new Date(),
    });

    const result = await service.award({
      userId: 'u1',
      currency: WalletCurrency.POINTS,
      amount: 5,
      reason: 'race',
      idempotencyKey: 'award-race',
    });

    expect(result.replayed).toBe(true);
    expect(result.entry.id).toBe('we-race');
  });
});
