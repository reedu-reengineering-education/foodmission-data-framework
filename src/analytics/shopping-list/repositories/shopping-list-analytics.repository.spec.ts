import { ShoppingListAnalyticsRepository } from './shopping-list-analytics.repository';

describe('ShoppingListAnalyticsRepository', () => {
  let repository: ShoppingListAnalyticsRepository;
  let prisma: Record<string, jest.Mocked<Record<string, jest.Mock>>>;

  beforeEach(() => {
    prisma = {
      shoppingListAnalyticsBatch: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      shoppingListAnalyticsItemPopularity: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      shoppingListAnalyticsCategoryPopularity: {
        createMany: jest.fn(),
      },
      shoppingListAnalyticsListPatterns: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      shoppingListAnalyticsNutritionProfile: {
        createMany: jest.fn(),
      },
      shoppingListAnalyticsSustainability: {
        createMany: jest.fn(),
      },
      shoppingListAnalyticsFoodGroups: {
        createMany: jest.fn(),
      },
      shoppingListAnalyticsDemographicPatterns: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      shoppingListAnalyticsDemographicNutrition: {
        createMany: jest.fn(),
      },
      shoppingListAnalyticsCrossDimPatterns: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      shoppingListAnalyticsCrossDimNutrition: {
        createMany: jest.fn(),
      },
    } as any;

    repository = new ShoppingListAnalyticsRepository(prisma as any);
  });

  it('findBatchById includes review data ordered where needed', async () => {
    prisma.shoppingListAnalyticsBatch.findUnique.mockResolvedValue({ id: 'b1' });

    await repository.findBatchById('b1');

    expect(prisma.shoppingListAnalyticsBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'b1' },
      include: expect.objectContaining({
        itemPopularity: { orderBy: { frequency: 'desc' } },
        categoryPopularity: { orderBy: { frequency: 'desc' } },
        listPatterns: true,
        nutritionProfile: true,
        sustainability: true,
        foodGroups: { orderBy: { frequency: 'desc' } },
      }),
    });
  });

  describe('updateBatchStatus', () => {
    it('sets publication metadata when publishing', async () => {
      prisma.shoppingListAnalyticsBatch.update.mockResolvedValue({ id: 'b1' });

      await repository.updateBatchStatus('b1', 'PUBLISHED' as any, 'admin-1');

      expect(prisma.shoppingListAnalyticsBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: expect.objectContaining({
          status: 'PUBLISHED',
          publishedAt: expect.any(Date),
          publishedBy: 'admin-1',
        }),
      });
    });

    it('sets rejection metadata when rejecting', async () => {
      prisma.shoppingListAnalyticsBatch.update.mockResolvedValue({ id: 'b1' });

      await repository.updateBatchStatus(
        'b1',
        'REJECTED' as any,
        'admin-1',
        'bad data quality',
      );

      expect(prisma.shoppingListAnalyticsBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectedAt: expect.any(Date),
          rejectedBy: 'admin-1',
          rejectionReason: 'bad data quality',
        }),
      });
    });
  });

  it.each([
    ['insertItemPopularity', 'shoppingListAnalyticsItemPopularity'],
    ['insertCategoryPopularity', 'shoppingListAnalyticsCategoryPopularity'],
    ['insertListPatterns', 'shoppingListAnalyticsListPatterns'],
    ['insertNutritionProfile', 'shoppingListAnalyticsNutritionProfile'],
    ['insertSustainability', 'shoppingListAnalyticsSustainability'],
    ['insertFoodGroups', 'shoppingListAnalyticsFoodGroups'],
    ['insertDemographicPatterns', 'shoppingListAnalyticsDemographicPatterns'],
    ['insertDemographicNutrition', 'shoppingListAnalyticsDemographicNutrition'],
    ['insertCrossDimPatterns', 'shoppingListAnalyticsCrossDimPatterns'],
    ['insertCrossDimNutrition', 'shoppingListAnalyticsCrossDimNutrition'],
  ])('%s calls prisma createMany on %s', async (method, model) => {
    const data = [{ batchId: 'b1' }] as any[];
    (prisma[model] as any).createMany.mockResolvedValue({ count: 1 });

    await (repository as any)[method](data);

    expect((prisma[model] as any).createMany).toHaveBeenCalledWith({ data });
  });

  it('applies published batch and date overlap filters', async () => {
    prisma.shoppingListAnalyticsListPatterns.findMany.mockResolvedValue([]);
    const from = new Date('2026-04-01');
    const to = new Date('2026-04-30');

    await repository.getPublishedListPatterns(from, to);

    expect(prisma.shoppingListAnalyticsListPatterns.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          batch: {
            status: 'PUBLISHED',
            periodEnd: { gt: from },
            periodStart: { lt: to },
          },
        },
      }),
    );
  });

  it('applies limit and ordering for item popularity', async () => {
    prisma.shoppingListAnalyticsItemPopularity.findMany.mockResolvedValue([]);

    await repository.getPublishedItemPopularity(undefined, undefined, 5);

    expect(
      prisma.shoppingListAnalyticsItemPopularity.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { batch: { status: 'PUBLISHED' } },
        orderBy: { frequency: 'desc' },
        take: 5,
      }),
    );
  });

  it('applies demographic dimension filters', async () => {
    prisma.shoppingListAnalyticsDemographicPatterns.findMany.mockResolvedValue(
      [],
    );

    await repository.getPublishedDemographicPatterns(
      undefined,
      undefined,
      'gender',
    );

    expect(
      prisma.shoppingListAnalyticsDemographicPatterns.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          batch: { status: 'PUBLISHED' },
          dimensionName: 'gender',
        }),
      }),
    );
  });

  it('applies cross-dimensional filters', async () => {
    prisma.shoppingListAnalyticsCrossDimPatterns.findMany.mockResolvedValue([]);

    await repository.getPublishedCrossDimPatterns(
      undefined,
      undefined,
      'ageGroup',
      'gender',
    );

    expect(
      prisma.shoppingListAnalyticsCrossDimPatterns.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          batch: { status: 'PUBLISHED' },
          dim1Name: 'ageGroup',
          dim2Name: 'gender',
        }),
      }),
    );
  });
});
