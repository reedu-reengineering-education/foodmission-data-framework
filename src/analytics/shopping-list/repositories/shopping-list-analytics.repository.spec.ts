import { ShoppingListAnalyticsRepository } from './shopping-list-analytics.repository';
import { AnalyticsBatchStatus } from '@prisma/client';

describe('ShoppingListAnalyticsRepository', () => {
  let repository: ShoppingListAnalyticsRepository;
  let prisma: Record<string, jest.Mocked<Record<string, jest.Mock>>>;

  beforeEach(() => {
    prisma = {
      shoppingListAnalyticsBatch: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      shoppingListAnalyticsItemPopularity: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      shoppingListAnalyticsCategoryPopularity: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      shoppingListAnalyticsListPatterns: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      shoppingListAnalyticsNutritionProfile: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      shoppingListAnalyticsSustainability: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      shoppingListAnalyticsFoodGroups: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      shoppingListAnalyticsDemographicPatterns: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      shoppingListAnalyticsDemographicNutrition: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      shoppingListAnalyticsCrossDimPatterns: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      shoppingListAnalyticsCrossDimNutrition: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
    } as any;

    repository = new ShoppingListAnalyticsRepository(prisma as any);
  });

  // ============================================================
  // createBatch
  // ============================================================

  it('createBatch delegates to prisma.create', async () => {
    const input = {
      periodStart: new Date('2026-04-01'),
      periodEnd: new Date('2026-04-02'),
      recordCount: 10,
    };
    const returned = { id: 'batch-1', ...input };
    prisma.shoppingListAnalyticsBatch.create.mockResolvedValue(returned as any);

    const result = await repository.createBatch(input);

    expect(prisma.shoppingListAnalyticsBatch.create).toHaveBeenCalledWith({
      data: input,
    });
    expect(result).toEqual(returned);
  });

  // ============================================================
  // findBatchById
  // ============================================================

  it('findBatchById includes all related tables', async () => {
    prisma.shoppingListAnalyticsBatch.findUnique.mockResolvedValue({
      id: 'b1',
    } as any);

    await repository.findBatchById('b1');

    const call = prisma.shoppingListAnalyticsBatch.findUnique.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'b1' });
    expect(call.include).toMatchObject({
      itemPopularity: expect.any(Object),
      categoryPopularity: expect.any(Object),
      listPatterns: true,
      nutritionProfile: true,
      sustainability: true,
      foodGroups: expect.any(Object),
      demographicPatterns: true,
      demographicNutrition: true,
      demographicClassification: true,
      crossDimPatterns: true,
      crossDimNutrition: true,
      crossDimClassification: true,
    });
  });

  // ============================================================
  // updateBatchStatus — published path
  // ============================================================

  it('updateBatchStatus sets publishedAt and publishedBy when publishing', async () => {
    const published = {
      id: 'b1',
      status: AnalyticsBatchStatus.PUBLISHED,
    };
    prisma.shoppingListAnalyticsBatch.update.mockResolvedValue(
      published as any,
    );

    await repository.updateBatchStatus(
      'b1',
      AnalyticsBatchStatus.PUBLISHED,
      'admin-1',
    );

    const data = prisma.shoppingListAnalyticsBatch.update.mock.calls[0][0].data;
    expect(data.status).toBe(AnalyticsBatchStatus.PUBLISHED);
    expect(data.publishedAt).toBeInstanceOf(Date);
    expect(data.publishedBy).toBe('admin-1');
  });

  it('updateBatchStatus sets rejectedAt, rejectedBy and rejectionReason when rejecting', async () => {
    const rejected = {
      id: 'b1',
      status: AnalyticsBatchStatus.REJECTED,
    };
    prisma.shoppingListAnalyticsBatch.update.mockResolvedValue(rejected as any);

    await repository.updateBatchStatus(
      'b1',
      AnalyticsBatchStatus.REJECTED,
      'admin-1',
      'bad data quality',
    );

    const data = prisma.shoppingListAnalyticsBatch.update.mock.calls[0][0].data;
    expect(data.status).toBe(AnalyticsBatchStatus.REJECTED);
    expect(data.rejectedAt).toBeInstanceOf(Date);
    expect(data.rejectedBy).toBe('admin-1');
    expect(data.rejectionReason).toBe('bad data quality');
  });

  // ============================================================
  // deleteBatch
  // ============================================================

  it('deleteBatch calls prisma.delete with the batch id', async () => {
    prisma.shoppingListAnalyticsBatch.delete.mockResolvedValue({} as any);

    await repository.deleteBatch('b1');

    expect(prisma.shoppingListAnalyticsBatch.delete).toHaveBeenCalledWith({
      where: { id: 'b1' },
    });
  });

  // ============================================================
  // Bulk inserts
  // ============================================================

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

  // ============================================================
  // Published data queries — batch filter
  // ============================================================

  it('getPublishedListPatterns filters by PUBLISHED status', async () => {
    prisma.shoppingListAnalyticsListPatterns.findMany.mockResolvedValue([]);

    await repository.getPublishedListPatterns();

    const where = (
      prisma.shoppingListAnalyticsListPatterns.findMany as jest.Mock
    ).mock.calls[0][0].where;
    expect(where.batch.status).toBe(AnalyticsBatchStatus.PUBLISHED);
  });

  it('getPublishedListPatterns applies from/to date filter on batch', async () => {
    prisma.shoppingListAnalyticsListPatterns.findMany.mockResolvedValue([]);
    const from = new Date('2026-04-01');
    const to = new Date('2026-04-30');

    await repository.getPublishedListPatterns(from, to);

    const where = (
      prisma.shoppingListAnalyticsListPatterns.findMany as jest.Mock
    ).mock.calls[0][0].where;
    expect(where.batch.periodEnd).toEqual({ gt: from });
    expect(where.batch.periodStart).toEqual({ lt: to });
  });

  it('getPublishedItemPopularity respects limit parameter', async () => {
    prisma.shoppingListAnalyticsItemPopularity.findMany.mockResolvedValue([]);

    await repository.getPublishedItemPopularity(undefined, undefined, 5);

    const callArg = (
      prisma.shoppingListAnalyticsItemPopularity.findMany as jest.Mock
    ).mock.calls[0][0];
    expect(callArg.take).toBe(5);
    expect(callArg.orderBy).toEqual({ frequency: 'desc' });
  });

  it('getPublishedDemographicPatterns filters by dimension when provided', async () => {
    prisma.shoppingListAnalyticsDemographicPatterns.findMany.mockResolvedValue(
      [],
    );

    await repository.getPublishedDemographicPatterns(
      undefined,
      undefined,
      'gender',
    );

    const where = (
      prisma.shoppingListAnalyticsDemographicPatterns.findMany as jest.Mock
    ).mock.calls[0][0].where;
    expect(where.dimensionName).toBe('gender');
  });

  it('getPublishedCrossDimPatterns filters by dim1 and dim2 when provided', async () => {
    prisma.shoppingListAnalyticsCrossDimPatterns.findMany.mockResolvedValue([]);

    await repository.getPublishedCrossDimPatterns(
      undefined,
      undefined,
      'ageGroup',
      'gender',
    );

    const where = (
      prisma.shoppingListAnalyticsCrossDimPatterns.findMany as jest.Mock
    ).mock.calls[0][0].where;
    expect(where.dim1Name).toBe('ageGroup');
    expect(where.dim2Name).toBe('gender');
  });
});
