import { MealLogAnalyticsController } from './meal-log-analytics.controller';
import { MealLogAnalyticsService } from '../services/meal-log-analytics.service';

describe('MealLogAnalyticsController', () => {
  let controller: MealLogAnalyticsController;
  let service: jest.Mocked<MealLogAnalyticsService>;

  beforeEach(() => {
    service = {
      getPublishedNutrition: jest.fn(),
      getPublishedFoodPopularity: jest.fn(),
      getPublishedPopularity: jest.fn(),
      getPublishedMealPatterns: jest.fn(),
      getPublishedSustainability: jest.fn(),
      getPublishedMealClassification: jest.fn(),
      getPublishedMealRecords: jest.fn(),
      getPublishedDemographicNutrition: jest.fn(),
      getPublishedDemographicClassification: jest.fn(),
      getPublishedDemographicPatterns: jest.fn(),
      getPublishedCrossDimNutrition: jest.fn(),
      getPublishedCrossDimClassification: jest.fn(),
      getPublishedCrossDimPatterns: jest.fn(),
      getPublishedSummary: jest.fn(),
      generateBatch: jest.fn(),
      runDailyAggregation: jest.fn(),
      listBatches: jest.fn(),
      getBatch: jest.fn(),
      approveBatch: jest.fn(),
      publishBatch: jest.fn(),
      rejectBatch: jest.fn(),
      deleteBatch: jest.fn(),
    } as unknown as jest.Mocked<MealLogAnalyticsService>;

    controller = new MealLogAnalyticsController(service);
  });

  describe('getPublicNutrition', () => {
    it('parses date and typeOfMeal filters', async () => {
      service.getPublishedNutrition.mockResolvedValue([]);

      await controller.getPublicNutrition('2026-04-01', '2026-04-30', 'DINNER');

      expect(service.getPublishedNutrition).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
        'DINNER',
      );
    });

    it('returns unified nutrition fields (no per100g naming)', async () => {
      service.getPublishedNutrition.mockResolvedValue([
        {
          id: 'n1',
          date: new Date('2026-04-01'),
          userCount: 7,
          entityCount: 12,
          avgCalories: 300,
        },
      ] as any);

      const result = await controller.getPublicNutrition();

      expect(result[0]).toMatchObject({
        id: 'n1',
        avgCalories: 300,
      });
      expect(result[0]).not.toHaveProperty('avgCaloriesPer100g');
    });
  });

  describe('getPublicPopularity', () => {
    it('parses limit and forwards dates', async () => {
      service.getPublishedPopularity.mockResolvedValue([]);

      await controller.getPublicPopularity('2026-04-01', '2026-04-30', '5');

      expect(service.getPublishedPopularity).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
        5,
      );
    });

    it('returns canonical itemName/itemGroup fields', async () => {
      service.getPublishedPopularity.mockResolvedValue([
        {
          id: 'p1',
          itemName: 'Apple',
          itemGroup: 'Fruit',
          itemType: 'food_product',
          frequency: 9,
        },
      ] as any);

      const result = await controller.getPublicPopularity();

      expect(result[0]).toMatchObject({
        itemName: 'Apple',
        itemGroup: 'Fruit',
      });
    });
  });

  describe('getPublicSummary', () => {
    it('parses date strings and forwards Date objects', async () => {
      service.getPublishedSummary.mockResolvedValue({ topItems: [] } as any);

      await controller.getPublicSummary('2026-04-01', '2026-04-30');

      expect(service.getPublishedSummary).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
      );
    });

    it('returns canonical summary blocks', async () => {
      const summary = {
        topItems: [],
        patterns: {},
        nutrition: {},
        sustainability: {},
        classification: {},
      };
      service.getPublishedSummary.mockResolvedValue(summary as any);

      const result = await controller.getPublicSummary();

      expect(result).toEqual(summary);
      expect(result).toHaveProperty('topItems');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('nutrition');
    });
  });

  describe('admin endpoints', () => {
    it('generateBatch parses required date strings', async () => {
      service.generateBatch.mockResolvedValue('new-batch');

      const result = await controller.generateBatch('2026-04-01', '2026-04-30');

      expect(service.generateBatch).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
      );
      expect(result).toEqual({ batchId: 'new-batch' });
    });

    it('listBatches passes optional status', async () => {
      service.listBatches.mockResolvedValue([]);

      await controller.listBatches('STAGING' as any);

      expect(service.listBatches).toHaveBeenCalledWith('STAGING');
    });
  });
});
