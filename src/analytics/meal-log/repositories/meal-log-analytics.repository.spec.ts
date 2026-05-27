import { MealLogAnalyticsRepository } from './meal-log-analytics.repository';

describe('MealLogAnalyticsRepository', () => {
  let repository: MealLogAnalyticsRepository;
  let prisma: any;

  beforeEach(() => {
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
    };

    repository = new MealLogAnalyticsRepository(prisma);
  });

  describe('updateBatchStatus', () => {
    it('sets publication metadata when publishing', async () => {
      prisma.mealLogAnalyticsBatch.update.mockResolvedValue({ id: 'b1' });

      await repository.updateBatchStatus('b1', 'PUBLISHED', 'admin-1');

      expect(prisma.mealLogAnalyticsBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: expect.objectContaining({
          status: 'PUBLISHED',
          publishedBy: 'admin-1',
          publishedAt: expect.any(Date),
        }),
      });
    });

    it('sets rejection metadata when rejecting', async () => {
      prisma.mealLogAnalyticsBatch.update.mockResolvedValue({ id: 'b1' });

      await repository.updateBatchStatus(
        'b1',
        'REJECTED',
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

  it('applies published batch, date overlap, and meal type filters', async () => {
    prisma.mealLogAnalyticsDailyNutrition.findMany.mockResolvedValue([]);
    const from = new Date('2026-04-01');
    const to = new Date('2026-04-30');

    await repository.getPublishedNutrition(from, to, 'DINNER');

    expect(prisma.mealLogAnalyticsDailyNutrition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          batch: {
            status: 'PUBLISHED',
            periodEnd: { gt: from },
            periodStart: { lt: to },
          },
          typeOfMeal: 'DINNER',
        }),
      }),
    );
  });

  it('applies limit and ordering for food popularity', async () => {
    prisma.mealLogAnalyticsFoodPopularity.findMany.mockResolvedValue([]);

    await repository.getPublishedFoodPopularity(undefined, undefined, 7);

    expect(prisma.mealLogAnalyticsFoodPopularity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { batch: { status: 'PUBLISHED' } },
        orderBy: { frequency: 'desc' },
        take: 7,
      }),
    );
  });

  it('applies demographic dimension filters', async () => {
    prisma.mealLogAnalyticsDemographicNutrition.findMany.mockResolvedValue([]);

    await repository.getPublishedDemographicNutrition(
      undefined,
      undefined,
      'LUNCH',
      'country',
    );

    expect(
      prisma.mealLogAnalyticsDemographicNutrition.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          batch: { status: 'PUBLISHED' },
          typeOfMeal: 'LUNCH',
          dimensionName: 'country',
        }),
      }),
    );
  });

  it('applies cross-dimensional filters', async () => {
    prisma.mealLogAnalyticsCrossDimNutrition.findMany.mockResolvedValue([]);

    await repository.getPublishedCrossDimNutrition(
      undefined,
      undefined,
      'SNACK',
      'ageGroup',
      'gender',
    );

    expect(prisma.mealLogAnalyticsCrossDimNutrition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          batch: { status: 'PUBLISHED' },
          typeOfMeal: 'SNACK',
          dim1Name: 'ageGroup',
          dim2Name: 'gender',
        }),
      }),
    );
  });
});
