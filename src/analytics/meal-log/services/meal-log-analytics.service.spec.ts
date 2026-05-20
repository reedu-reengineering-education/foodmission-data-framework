import { MealLogAnalyticsService } from './meal-log-analytics.service';
import { MealLogAnalyticsRepository } from '../repositories/meal-log-analytics.repository';
import { MealLogAnalyticsAggregator } from './meal-log-analytics-aggregator.service';
import { MealLogAnalyticsBatchStatus } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

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
    } as unknown as jest.Mocked<MealLogAnalyticsRepository>;

    service = new MealLogAnalyticsService(
      repository,
      {} as MealLogAnalyticsAggregator,
    );
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
    expect(result.nutrition.latestAvgCalories).toBe(120);
    expect(result.nutrition.latestAvgProteins).toBe(15);
    expect(result.topFoods).toEqual([
      { name: 'Apple', frequency: 8, uniqueUsers: 5 },
    ]);
    expect(result.mealPatterns.avgPantryUsagePct).toBe(50);
    expect(result.mealPatterns.avgItemsPerMeal).toBe(3);
    expect(result.sustainability.avgSustainabilityScore).toBe(50);
    expect(result.classification.avgVegetarianPct).toBe(30);
    expect(result.classification.avgVeganPct).toBe(20);
    expect(result.classification.avgUltraProcessedPct).toBe(60);
  });

  describe('approveBatch', () => {
    it('should approve a STAGING batch', async () => {
      const batch = { id: 'b1', status: MealLogAnalyticsBatchStatus.STAGING };
      const approved = {
        ...batch,
        status: MealLogAnalyticsBatchStatus.APPROVED,
      };
      repository.findBatchById.mockResolvedValueOnce(batch as any);
      repository.updateBatchStatus.mockResolvedValueOnce(approved as any);

      const result = await service.approveBatch('b1', 'admin1');

      expect(repository.updateBatchStatus).toHaveBeenCalledWith(
        'b1',
        MealLogAnalyticsBatchStatus.APPROVED,
        'admin1',
      );
      expect(result).toEqual(approved);
    });

    it('should throw Error for non-STAGING batch', async () => {
      const batch = { id: 'b1', status: MealLogAnalyticsBatchStatus.PUBLISHED };
      repository.findBatchById.mockResolvedValueOnce(batch as any);

      await expect(service.approveBatch('b1', 'admin1')).rejects.toThrow(
        'Batch is PUBLISHED, can only approve STAGING batches',
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
      const batch = { id: 'b1', status: MealLogAnalyticsBatchStatus.APPROVED };
      const published = {
        ...batch,
        status: MealLogAnalyticsBatchStatus.PUBLISHED,
      };
      repository.findBatchById.mockResolvedValueOnce(batch as any);
      repository.updateBatchStatus.mockResolvedValueOnce(published as any);

      const result = await service.publishBatch('b1', 'admin1');

      expect(repository.updateBatchStatus).toHaveBeenCalledWith(
        'b1',
        MealLogAnalyticsBatchStatus.PUBLISHED,
        'admin1',
      );
      expect(result).toEqual(published);
    });

    it('should throw Error for non-APPROVED batch', async () => {
      const batch = { id: 'b1', status: MealLogAnalyticsBatchStatus.STAGING };
      repository.findBatchById.mockResolvedValueOnce(batch as any);

      await expect(service.publishBatch('b1', 'admin1')).rejects.toThrow(
        'Batch is STAGING, can only publish APPROVED batches',
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
