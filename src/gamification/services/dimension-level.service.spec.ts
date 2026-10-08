import {
  ContentLevel,
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyLegumeFrequency,
  WeeklyMeatRange,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EventType } from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';
import { DimensionLevelService } from './dimension-level.service';

function build() {
  const prisma = {
    user: { findUnique: jest.fn() },
    dimension: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'd-diet', code: 'DIET_CHANGES' },
        { id: 'd-prod', code: 'PRODUCTION_METHODS' },
      ]),
    },
    userDimensionLevel: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    quest: {
      findMany: jest.fn().mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]),
    },
    questProgress: { count: jest.fn() },
  };
  const userEventService = { record: jest.fn() };
  const service = new DimensionLevelService(
    prisma as unknown as PrismaService,
    userEventService as unknown as UserEventService,
  );
  return { service, prisma, userEventService };
}

describe('DimensionLevelService', () => {
  describe('ensureForUser', () => {
    it('creates missing levels from the onboarding answers', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue({
        segment: UserSegment.INTERMEDIATE,
        weeklyMeatConsumption: WeeklyMeatRange.FIFTEEN_PLUS,
      });

      await service.ensureForUser('u1');

      expect(prisma.userDimensionLevel.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'u1',
            dimensionId: 'd-diet',
            level: ContentLevel.BEGINNER,
          },
          // Nothing answered here: skipped questions score 0.
          {
            userId: 'u1',
            dimensionId: 'd-prod',
            level: ContentLevel.BEGINNER,
          },
        ],
        skipDuplicates: true,
      });
    });

    it('starts every dimension as BEGINNER before the survey', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue({ segment: null });

      await service.ensureForUser('u1');

      expect(prisma.userDimensionLevel.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'u1', dimensionId: 'd-diet', level: ContentLevel.BEGINNER },
          { userId: 'u1', dimensionId: 'd-prod', level: ContentLevel.BEGINNER },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe('applySurveyLevels', () => {
    const advancedDiet = {
      weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
      weeklyBeefConsumption: WeeklyBeefFrequency.NEVER,
      weeklyLegumeConsumption: WeeklyLegumeFrequency.DAILY,
    };

    it('raises a pre-survey BEGINNER level to the survey score', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue(advancedDiet);
      prisma.userDimensionLevel.findMany
        .mockResolvedValueOnce([{ dimensionId: 'd-diet' }]) // ensureForUser
        .mockResolvedValueOnce([
          {
            dimensionId: 'd-diet',
            level: ContentLevel.BEGINNER,
            dimension: { code: 'DIET_CHANGES' },
          },
          {
            dimensionId: 'd-prod',
            level: ContentLevel.BEGINNER,
            dimension: { code: 'PRODUCTION_METHODS' },
          },
        ]);

      await service.applySurveyLevels('u1');

      expect(prisma.userDimensionLevel.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.userDimensionLevel.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          dimensionId: 'd-diet',
          level: ContentLevel.BEGINNER,
        },
        data: { level: ContentLevel.ADVANCED },
      });
    });

    it('never lowers a level earned before the survey', async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValue({});
      prisma.userDimensionLevel.findMany
        .mockResolvedValueOnce([
          { dimensionId: 'd-diet' },
          { dimensionId: 'd-prod' },
        ])
        .mockResolvedValueOnce([
          {
            dimensionId: 'd-diet',
            level: ContentLevel.INTERMEDIATE,
            dimension: { code: 'DIET_CHANGES' },
          },
        ]);

      await service.applySurveyLevels('u1');

      expect(prisma.userDimensionLevel.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('levelUpIfComplete', () => {
    it('levels up once every quest at the level is completed', async () => {
      const { service, prisma, userEventService } = build();
      prisma.userDimensionLevel.findUnique.mockResolvedValue({
        level: ContentLevel.BEGINNER,
        dimension: { code: 'DIET_CHANGES' },
      });
      prisma.questProgress.count.mockResolvedValue(2);

      const result = await service.levelUpIfComplete('u1', 'd-diet');

      expect(result).toEqual({
        dimensionCode: 'DIET_CHANGES',
        from: ContentLevel.BEGINNER,
        to: ContentLevel.INTERMEDIATE,
      });
      expect(prisma.quest.findMany).toHaveBeenCalledWith({
        where: {
          dimensionId: 'd-diet',
          level: ContentLevel.BEGINNER,
          available: true,
        },
        select: { id: true },
      });
      expect(prisma.userDimensionLevel.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          dimensionId: 'd-diet',
          level: ContentLevel.BEGINNER,
        },
        data: { level: ContentLevel.INTERMEDIATE },
      });
      expect(userEventService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: EventType.DIMENSION_LEVEL_UP,
          idempotencyKey: 'dimension-level-up:u1:d-diet:INTERMEDIATE',
        }),
      );
    });

    it('stays while quests are left', async () => {
      const { service, prisma } = build();
      prisma.userDimensionLevel.findUnique.mockResolvedValue({
        level: ContentLevel.BEGINNER,
        dimension: { code: 'DIET_CHANGES' },
      });
      prisma.questProgress.count.mockResolvedValue(1);

      expect(await service.levelUpIfComplete('u1', 'd-diet')).toBeNull();
      expect(prisma.userDimensionLevel.updateMany).not.toHaveBeenCalled();
    });

    it('stops at ADVANCED', async () => {
      const { service, prisma } = build();
      prisma.userDimensionLevel.findUnique.mockResolvedValue({
        level: ContentLevel.ADVANCED,
        dimension: { code: 'DIET_CHANGES' },
      });

      expect(await service.levelUpIfComplete('u1', 'd-diet')).toBeNull();
      expect(prisma.quest.findMany).not.toHaveBeenCalled();
    });

    it('does not level past a level with no quests', async () => {
      const { service, prisma } = build();
      prisma.userDimensionLevel.findUnique.mockResolvedValue({
        level: ContentLevel.BEGINNER,
        dimension: { code: 'DIET_CHANGES' },
      });
      prisma.quest.findMany.mockResolvedValue([]);

      expect(await service.levelUpIfComplete('u1', 'd-diet')).toBeNull();
    });

    it('levels up once when a concurrent call already did', async () => {
      const { service, prisma, userEventService } = build();
      prisma.userDimensionLevel.findUnique.mockResolvedValue({
        level: ContentLevel.BEGINNER,
        dimension: { code: 'DIET_CHANGES' },
      });
      prisma.questProgress.count.mockResolvedValue(2);
      prisma.userDimensionLevel.updateMany.mockResolvedValue({ count: 0 });

      expect(await service.levelUpIfComplete('u1', 'd-diet')).toBeNull();
      expect(userEventService.record).not.toHaveBeenCalled();
    });
  });
});
