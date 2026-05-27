import { MealLogAnalyticsService } from './meal-log-analytics.service';
import { MealLogAnalyticsRepository } from '../repositories/meal-log-analytics.repository';
import { MealLogAnalyticsAggregator } from './meal-log-analytics-aggregator.service';
// Prisma enum export unavailable in this workspace; use literal statuses in tests.
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('MealLogAnalyticsService', () => {
  let service: MealLogAnalyticsService;
  let repository: jest.Mocked<MealLogAnalyticsRepository>;

  beforeEach(() => {
    repository = {
      getPublishedNutrition: jest.fn(),
      getPublishedFoodPopularity: jest.fn(),
      getPublishedMealPatterns: jest.fn(),
      getPublishedSustainability: jest.fn(),
      getPublishedMealClassification: jest.fn(),
      findBatchById: jest.fn(),
      updateBatchStatus: jest.fn(),
      createBatch: jest.fn(),
      deleteBatch: jest.fn(),
      supersedeBatchesForPeriod: jest.fn().mockResolvedValue(undefined),
      insertDailyNutrition: jest.fn(),
      insertFoodPopularity: jest.fn(),
      insertMealPatterns: jest.fn(),
      insertSustainability: jest.fn(),
      insertMealClassification: jest.fn(),
      insertMealRecords: jest.fn(),
    } as unknown as jest.Mocked<MealLogAnalyticsRepository>;

    service = new MealLogAnalyticsService(
      repository,
      {} as MealLogAnalyticsAggregator,
    );
  });

  // ============================================================
  // runDailyAggregation
  // ============================================================

  describe('runDailyAggregation', () => {
    const emptyAggResult = {
      dailyNutrition: [],
      foodPopularity: [],
      mealPatterns: [],
      sustainability: [],
      mealClassification: [],
      mealRecords: [],
      demographicNutrition: [],
      demographicClassification: [],
      demographicPatterns: [],
      crossDimNutrition: [],
      crossDimClassification: [],
      crossDimPatterns: [],
      totalRecords: 0,
      suppressedGroups: 0,
    };
    let aggregatorMock: jest.Mocked<MealLogAnalyticsAggregator>;

    beforeEach(() => {
      aggregatorMock = {
        aggregate: jest.fn().mockResolvedValue(emptyAggResult),
      } as unknown as jest.Mocked<MealLogAnalyticsAggregator>;
      // rebuild service with a real aggregator mock
      service = new MealLogAnalyticsService(repository, aggregatorMock);
      repository.createBatch.mockResolvedValue({ id: 'daily-batch' } as any);
      repository.updateBatchStatus.mockResolvedValue({
        id: 'daily-batch',
        status: 'PUBLISHED',
      } as any);
    });

    it('supersedes existing published batches for the period after publishing', async () => {
      await service.runDailyAggregation();

      expect(repository.supersedeBatchesForPeriod).toHaveBeenCalledTimes(1);
      // supersede is called after updateBatchStatus (publish)
      const supersedeOrder =
        repository.supersedeBatchesForPeriod.mock.invocationCallOrder[0];
      const publishOrder =
        repository.updateBatchStatus.mock.invocationCallOrder[0];
      expect(publishOrder).toBeLessThan(supersedeOrder);
    });

    it('auto-publishes the generated batch as system user', async () => {
      await service.runDailyAggregation();

      expect(repository.updateBatchStatus).toHaveBeenCalledWith(
        'daily-batch',
        'PUBLISHED',
        'system',
      );
    });

    it('returns the batch id', async () => {
      const id = await service.runDailyAggregation();

      expect(id).toBe('daily-batch');
    });

    it('uses yesterday midnight UTC as periodStart', async () => {
      await service.runDailyAggregation();

      const { periodStart } = repository.createBatch.mock.calls[0][0];
      expect(periodStart.getUTCHours()).toBe(0);
      expect(periodStart.getUTCMinutes()).toBe(0);
      expect(periodStart.getUTCSeconds()).toBe(0);
    });
  });

  it('getPublishedSummary computes derived values and handles nulls', async () => {
    repository.getPublishedNutrition.mockResolvedValueOnce([
      {
        date: new Date('2026-04-01T00:00:00.000Z'),
        avgCalories: 100,
        avgProteins: 10,
        avgFat: 4,
        avgCarbs: 12,
      },
      {
        date: new Date('2026-04-21T00:00:00.000Z'),
        avgCalories: 120,
        avgProteins: 15,
        avgFat: 5,
        avgCarbs: 20,
      },
    ] as any);
    repository.getPublishedFoodPopularity.mockResolvedValueOnce([
      { foodName: 'Apple', frequency: 8, uniqueUsers: 5 },
    ] as any);
    repository.getPublishedMealPatterns.mockResolvedValueOnce([
      { mealsFromPantryPct: 60, avgItemsPerMeal: 2 },
      { mealsFromPantryPct: 40, avgItemsPerMeal: 4 },
    ] as any);
    repository.getPublishedSustainability.mockResolvedValueOnce([
      { avgSustainabilityScore: null },
      { avgSustainabilityScore: 50 },
    ] as any);
    repository.getPublishedMealClassification.mockResolvedValueOnce([
      { vegetarianPct: 20, veganPct: 10, avgUltraProcessedPct: null },
      { vegetarianPct: 40, veganPct: 30, avgUltraProcessedPct: 60 },
    ] as any);

    const result = await service.getPublishedSummary();

    expect(result.period.from).toBeNull();
    expect(result.period.to).toBeNull();
    expect(result.metadata.capabilities).toMatchObject({
      supportsNutrition: true,
      supportsDemographicNutrition: true,
      supportsCrossDimNutrition: true,
      supportsClassification: true,
      supportsRecords: true,
      supportedDimensions: [
        'ageGroup',
        'country',
        'educationLevel',
        'gender',
        'region',
      ],
      privacyThresholds: {
        singleDimMinUsers: 5,
        crossDimMinUsers: 20,
      },
    });
    expect(result.nutrition.latestAvgCalories).toBe(120);
    expect(result.nutrition.latestAvgProteins).toBe(15);
    expect(result.topItems).toEqual([
      {
        itemName: 'Apple',
        itemGroup: undefined,
        itemType: undefined,
        frequency: 8,
        uniqueUsers: 5,
      },
    ]);
    expect(result.patterns.avgPantryPct).toBe(50);
    expect(result.patterns.avgItemsPerEntity).toBe(3);
    expect(result.sustainability.avgSustainabilityScore).toBe(50);
    expect(result.classification.avgVegetarianPct).toBe(30);
    expect(result.classification.avgVeganPct).toBe(20);
    expect(result.classification.avgUltraProcessedPct).toBe(60);
    expect(result.nutrition).not.toHaveProperty('latestAvgCaloriesPer100g');
  });

  describe('approveBatch', () => {
    it('should approve a STAGING batch', async () => {
      const batch = { id: 'b1', status: 'STAGING' };
      const approved = {
        ...batch,
        status: 'APPROVED',
      };
      repository.findBatchById.mockResolvedValueOnce(batch as any);
      repository.updateBatchStatus.mockResolvedValueOnce(approved as any);

      const result = await service.approveBatch('b1', 'admin1');

      expect(repository.updateBatchStatus).toHaveBeenCalledWith(
        'b1',
        'APPROVED',
        'admin1',
      );
      expect(result).toEqual(approved);
    });

    it('should throw BadRequestException for non-STAGING batch', async () => {
      const batch = { id: 'b1', status: 'PUBLISHED' };
      repository.findBatchById.mockResolvedValueOnce(batch as any);

      await expect(service.approveBatch('b1', 'admin1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if batch not found', async () => {
      repository.findBatchById.mockResolvedValueOnce(null);

      await expect(service.approveBatch('missing', 'admin1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('publishBatch', () => {
    it('should publish an APPROVED batch', async () => {
      const batch = { id: 'b1', status: 'APPROVED' };
      const published = {
        ...batch,
        status: 'PUBLISHED',
      };
      repository.findBatchById.mockResolvedValueOnce(batch as any);
      repository.updateBatchStatus.mockResolvedValueOnce(published as any);

      const result = await service.publishBatch('b1', 'admin1');

      expect(repository.updateBatchStatus).toHaveBeenCalledWith(
        'b1',
        'PUBLISHED',
        'admin1',
      );
      expect(result).toEqual(published);
    });

    it('should throw BadRequestException for non-APPROVED batch', async () => {
      const batch = { id: 'b1', status: 'STAGING' };
      repository.findBatchById.mockResolvedValueOnce(batch as any);

      await expect(service.publishBatch('b1', 'admin1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if batch not found', async () => {
      repository.findBatchById.mockResolvedValueOnce(null);

      await expect(service.publishBatch('missing', 'admin1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
