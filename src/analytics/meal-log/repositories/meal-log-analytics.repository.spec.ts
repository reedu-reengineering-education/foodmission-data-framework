import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../database/prisma.service';
import { MealLogAnalyticsRepository } from './meal-log-analytics.repository';

describe('MealLogAnalyticsRepository', () => {
  let repository: MealLogAnalyticsRepository;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      mealLogAnalyticsBatch: {
        update: jest.fn(),
      },
      mealLogAnalyticsDailyNutrition: {
        findMany: jest.fn(),
      },
      mealLogAnalyticsFoodPopularity: {
        findMany: jest.fn(),
      },
      mealLogAnalyticsDemographicNutrition: {
        findMany: jest.fn(),
      },
      mealLogAnalyticsCrossDimNutrition: {
        findMany: jest.fn(),
      },
      mealLogAnalyticsMealRecord: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealLogAnalyticsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<MealLogAnalyticsRepository>(MealLogAnalyticsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateBatchStatus', () => {
    it('sets published metadata when status is PUBLISHED', async () => {
      prisma.mealLogAnalyticsBatch.update.mockResolvedValueOnce({ id: 'b1' });

      await repository.updateBatchStatus(
        'b1',
        'PUBLISHED' as any,
        'admin-1',
      );

      expect(prisma.mealLogAnalyticsBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: expect.objectContaining({
          status: 'PUBLISHED',
          publishedBy: 'admin-1',
          publishedAt: expect.any(Date),
        }),
      });
    });

    it('sets rejection metadata when status is REJECTED', async () => {
      prisma.mealLogAnalyticsBatch.update.mockResolvedValueOnce({ id: 'b1' });

      await repository.updateBatchStatus(
        'b1',
        'REJECTED' as any,
        'admin-1',
        'invalid data',
      );

      expect(prisma.mealLogAnalyticsBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectedBy: 'admin-1',
          rejectedAt: expect.any(Date),
          rejectionReason: 'invalid data',
        }),
      });
    });
  });

  describe('getPublishedNutrition', () => {
    it('always filters by PUBLISHED status', async () => {
      prisma.mealLogAnalyticsDailyNutrition.findMany.mockResolvedValueOnce([]);

      await repository.getPublishedNutrition();

      expect(prisma.mealLogAnalyticsDailyNutrition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            batch: { status: 'PUBLISHED' },
          }),
        }),
      );
    });

    it('adds date range and typeOfMeal filters when provided', async () => {
      prisma.mealLogAnalyticsDailyNutrition.findMany.mockResolvedValueOnce([]);
      const from = new Date('2026-04-01');
      const to = new Date('2026-04-30');

      await repository.getPublishedNutrition(from, to, 'DINNER');

      expect(prisma.mealLogAnalyticsDailyNutrition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            batch: {
              status: 'PUBLISHED',
              periodStart: { gte: from },
              periodEnd: { lte: to },
            },
            typeOfMeal: 'DINNER',
          }),
        }),
      );
    });
  });

  describe('getPublishedFoodPopularity', () => {
    it('applies limit and published batch filter', async () => {
      prisma.mealLogAnalyticsFoodPopularity.findMany.mockResolvedValueOnce([]);

      await repository.getPublishedFoodPopularity(undefined, undefined, 7);

      expect(prisma.mealLogAnalyticsFoodPopularity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { batch: { status: 'PUBLISHED' } },
          take: 7,
        }),
      );
    });
  });

  describe('getPublishedDemographicNutrition', () => {
    it('applies dynamic dimension filter when provided', async () => {
      prisma.mealLogAnalyticsDemographicNutrition.findMany.mockResolvedValueOnce(
        [],
      );

      await repository.getPublishedDemographicNutrition(
        undefined,
        undefined,
        'DINNER',
        'country' as any,
      );

      expect(
        prisma.mealLogAnalyticsDemographicNutrition.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            batch: { status: 'PUBLISHED' },
            typeOfMeal: 'DINNER',
            country: { not: null },
          }),
        }),
      );
    });
  });

  describe('getPublishedCrossDimNutrition', () => {
    it('applies dim1 and dim2 filters when provided', async () => {
      prisma.mealLogAnalyticsCrossDimNutrition.findMany.mockResolvedValueOnce([]);

      await repository.getPublishedCrossDimNutrition(
        undefined,
        undefined,
        'LUNCH',
        'ageGroup' as any,
        'gender' as any,
      );

      expect(prisma.mealLogAnalyticsCrossDimNutrition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            batch: { status: 'PUBLISHED' },
            typeOfMeal: 'LUNCH',
            dim1Name: 'ageGroup',
            dim2Name: 'gender',
          }),
        }),
      );
    });
  });

  describe('getPublishedMealRecords', () => {
    it('applies typeOfMeal filter and published batch filter', async () => {
      prisma.mealLogAnalyticsMealRecord.findMany.mockResolvedValueOnce([]);

      await repository.getPublishedMealRecords(undefined, undefined, 'SNACK');

      expect(prisma.mealLogAnalyticsMealRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            batch: { status: 'PUBLISHED' },
            typeOfMeal: 'SNACK',
          }),
        }),
      );
    });
  });
});
