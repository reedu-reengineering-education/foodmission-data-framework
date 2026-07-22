import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GamificationProfileService } from './gamification-profile.service';
import { BadgeService } from './badge.service';

describe('GamificationProfileService', () => {
  let service: GamificationProfileService;
  let prisma: { user: { findUnique: jest.Mock } };
  let badgeService: { listForUser: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
    };
    badgeService = {
      listForUser: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: BadgeService, useValue: badgeService },
      ],
    }).compile();

    service = module.get(GamificationProfileService);
  });

  it('throws when user is missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getProfileForUserId('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns assembled gamification profile', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      segment: 'BEGINNER',
      currentQuestId: 'quest-1',
      lastLoginAt: new Date('2026-07-01T10:00:00Z'),
      weeklyMeatConsumption: 'ZERO_TO_FOUR',
      weeklyBeefConsumption: 'NEVER',
      weeklyFoodWaste: 'ZERO',
      weeklyUpfConsumption: 'ZERO_TO_THREE',
      weeklyReusableOrRefill: 'TEN_PLUS',
      preferences: {},
      gamificationWallet: {
        level: 2,
        xp: 150,
        points: 40,
        updatedAt: new Date('2026-07-01T11:00:00Z'),
      },
      progressIndicators: [
        {
          id: 'pi-1',
          kind: 'FOOD_CHOICES',
          precision: 'SOFT',
          level: 1,
          accumulatedValue: 2,
          targetValue: 10,
          allTimeTotal: 2,
          cycleStartedAt: new Date('2026-07-01T00:00:00Z'),
          lastUpdatedAt: new Date('2026-07-01T12:00:00Z'),
        },
      ],
      userEvents: [
        {
          id: 'e1',
          userId: 'u1',
          eventType: 'POINTS_AWARDED',
          source: 'wallet',
          groupId: null,
          metadata: { source: 'test' },
          createdAt: new Date('2026-07-01T12:00:00Z'),
        },
      ],
      walletEntries: [
        {
          id: 'w1',
          currency: 'POINTS',
          amount: 40,
          balanceAfter: 40,
          reason: 'SEED_INITIAL_POINTS',
          eventId: 'e1',
          createdAt: new Date('2026-07-01T12:00:00Z'),
        },
      ],
    });

    const result = await service.getProfileForUserId('u1', {
      eventsLimit: 5,
      walletEntriesLimit: 5,
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        include: expect.objectContaining({
          userEvents: expect.objectContaining({ take: 5 }),
          walletEntries: expect.objectContaining({ take: 5 }),
        }),
      }),
    );
    expect(badgeService.listForUser).toHaveBeenCalledWith('u1');
    expect(result.userId).toBe('u1');
    expect(result.preferences?.onboardingSurvey).toEqual({
      weeklyMeatConsumption: 'ZERO_TO_FOUR',
      weeklyBeefConsumption: 'NEVER',
      weeklyFoodWaste: 'ZERO',
      weeklyUpfConsumption: 'ZERO_TO_THREE',
      weeklyReusableOrRefill: 'TEN_PLUS',
    });
    expect(result.wallet?.points).toBe(40);
    expect(result.progressIndicators).toHaveLength(1);
    expect(result.badges).toEqual([]);
    expect(result.recentEvents[0].eventType).toBe('POINTS_AWARDED');
    expect(result.recentEvents[0].source).toBe('wallet');
    expect(result.recentEvents[0].timestamp).toBeDefined();
    expect(result.recentWalletEntries[0].amount).toBe(40);
  });
});
