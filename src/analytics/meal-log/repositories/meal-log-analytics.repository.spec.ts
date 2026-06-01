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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealLogAnalyticsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<MealLogAnalyticsRepository>(
      MealLogAnalyticsRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
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

  describe('getPublishedNutrition', () => {
    it('always filters by PUBLISHED status', async () => {
      prisma.mealLogAnalyticsDailyNutrition.findMany.mockResolvedValueOnce([]);

      await repository.getPublishedNutrition();

      expect(
        prisma.mealLogAnalyticsDailyNutrition.findMany,
      ).toHaveBeenCalledWith(
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

      expect(
        prisma.mealLogAnalyticsDailyNutrition.findMany,
      ).toHaveBeenCalledWith(
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

  it('applies limit and ordering for food popularity', async () => {
    prisma.mealLogAnalyticsFoodPopularity.findMany.mockResolvedValue([]);

    await repository.getPublishedFoodPopularity(undefined, undefined, 7);
      expect(
        prisma.mealLogAnalyticsFoodPopularity.findMany,
      ).toHaveBeenCalledWith(
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
        'country',
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
      prisma.mealLogAnalyticsCrossDimNutrition.findMany.mockResolvedValueOnce(
        [],
      );

      await repository.getPublishedCrossDimNutrition(
        undefined,
        undefined,
        'LUNCH',
        'ageGroup',
        'gender',
      );

      expect(
        prisma.mealLogAnalyticsCrossDimNutrition.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            batch: { status: 'PUBLISHED' },
            typeOfMeal: 'LUNCH',
            dim1Name: 'ageGroup',
            dim2Name: 'gender',
          }),
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
