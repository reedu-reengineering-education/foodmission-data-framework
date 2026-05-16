import { ShoppingListAnalyticsController } from './shopping-list-analytics.controller';
import { ShoppingListAnalyticsService } from '../services/shopping-list-analytics.service';
import { ShoppingListAnalyticsBatchStatus } from '@prisma/client';

describe('ShoppingListAnalyticsController', () => {
  let controller: ShoppingListAnalyticsController;
  let service: jest.Mocked<ShoppingListAnalyticsService>;

  beforeEach(() => {
    service = {
      getPublishedItemPopularity: jest.fn(),
      getPublishedCategoryPopularity: jest.fn(),
      getPublishedListPatterns: jest.fn(),
      getPublishedNutritionProfile: jest.fn(),
      getPublishedSustainability: jest.fn(),
      getPublishedFoodGroups: jest.fn(),
      getPublishedDemographicPatterns: jest.fn(),
      getPublishedDemographicNutrition: jest.fn(),
      getPublishedCrossDimPatterns: jest.fn(),
      getPublishedCrossDimNutrition: jest.fn(),
      getPublishedSummary: jest.fn(),
      generateBatch: jest.fn(),
      runDailyAggregation: jest.fn(),
      listBatches: jest.fn(),
      getBatch: jest.fn(),
      approveBatch: jest.fn(),
      publishBatch: jest.fn(),
      rejectBatch: jest.fn(),
      deleteBatch: jest.fn(),
    } as unknown as jest.Mocked<ShoppingListAnalyticsService>;

    controller = new ShoppingListAnalyticsController(service);
  });

  // ============================================================
  // Public endpoints — query param parsing
  // ============================================================

  describe('getPublicItemPopularity', () => {
    it('passes parsed Date objects and default limit=20', async () => {
      service.getPublishedItemPopularity.mockResolvedValue([]);

      await controller.getPublicItemPopularity('2026-04-01', '2026-04-30');

      expect(service.getPublishedItemPopularity).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
        20,
      );
    });

    it('passes undefined dates and parsed limit when only limit provided', async () => {
      service.getPublishedItemPopularity.mockResolvedValue([]);

      await controller.getPublicItemPopularity(undefined, undefined, '5');

      expect(service.getPublishedItemPopularity).toHaveBeenCalledWith(
        undefined,
        undefined,
        5,
      );
    });

    it('uses limit=20 when limit string is absent', async () => {
      service.getPublishedItemPopularity.mockResolvedValue([]);

      await controller.getPublicItemPopularity();

      const call = service.getPublishedItemPopularity.mock.calls[0];
      expect(call[2]).toBe(20);
    });
  });

  describe('getPublicCategoryPopularity', () => {
    it('passes parsed Date objects and integer limit', async () => {
      service.getPublishedCategoryPopularity.mockResolvedValue([]);

      await controller.getPublicCategoryPopularity(
        '2026-04-01',
        '2026-04-30',
        '10',
      );

      expect(service.getPublishedCategoryPopularity).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
        10,
      );
    });
  });

  describe('getPublicListPatterns', () => {
    it('passes parsed Date objects', async () => {
      service.getPublishedListPatterns.mockResolvedValue([]);

      await controller.getPublicListPatterns('2026-04-01', '2026-04-30');

      expect(service.getPublishedListPatterns).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
      );
    });

    it('passes undefined when no dates provided', async () => {
      service.getPublishedListPatterns.mockResolvedValue([]);

      await controller.getPublicListPatterns();

      expect(service.getPublishedListPatterns).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });
  });

  describe('getPublicNutritionProfile', () => {
    it('delegates to service with parsed dates', async () => {
      service.getPublishedNutritionProfile.mockResolvedValue([]);

      await controller.getPublicNutritionProfile('2026-04-01', '2026-04-30');

      expect(service.getPublishedNutritionProfile).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
      );
    });
  });

  describe('getPublicSustainability', () => {
    it('delegates to service with parsed dates', async () => {
      service.getPublishedSustainability.mockResolvedValue([]);

      await controller.getPublicSustainability('2026-04-01', '2026-04-30');

      expect(service.getPublishedSustainability).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
      );
    });
  });

  describe('getPublicFoodGroups', () => {
    it('passes parsed dates and default limit=20', async () => {
      service.getPublishedFoodGroups.mockResolvedValue([]);

      await controller.getPublicFoodGroups('2026-04-01', '2026-04-30');

      expect(service.getPublishedFoodGroups).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
        20,
      );
    });
  });

  describe('getPublicDemographicPatterns', () => {
    it('passes dimension filter to service', async () => {
      service.getPublishedDemographicPatterns.mockResolvedValue([]);

      await controller.getPublicDemographicPatterns(
        '2026-04-01',
        '2026-04-30',
        'gender',
      );

      expect(service.getPublishedDemographicPatterns).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
        'gender',
      );
    });

    it('passes undefined dimension when not provided', async () => {
      service.getPublishedDemographicPatterns.mockResolvedValue([]);

      await controller.getPublicDemographicPatterns();

      expect(service.getPublishedDemographicPatterns).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('getPublicDemographicNutrition', () => {
    it('passes dimension filter to service', async () => {
      service.getPublishedDemographicNutrition.mockResolvedValue([]);

      await controller.getPublicDemographicNutrition(
        undefined,
        undefined,
        'ageGroup',
      );

      expect(service.getPublishedDemographicNutrition).toHaveBeenCalledWith(
        undefined,
        undefined,
        'ageGroup',
      );
    });
  });

  describe('getPublicCrossDimPatterns', () => {
    it('passes dim1 and dim2 filter to service', async () => {
      service.getPublishedCrossDimPatterns.mockResolvedValue([]);

      await controller.getPublicCrossDimPatterns(
        '2026-04-01',
        '2026-04-30',
        'ageGroup',
        'gender',
      );

      expect(service.getPublishedCrossDimPatterns).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
        'ageGroup',
        'gender',
      );
    });
  });

  describe('getPublicCrossDimNutrition', () => {
    it('passes dim filters to service', async () => {
      service.getPublishedCrossDimNutrition.mockResolvedValue([]);

      await controller.getPublicCrossDimNutrition(
        undefined,
        undefined,
        'country',
        'educationLevel',
      );

      expect(service.getPublishedCrossDimNutrition).toHaveBeenCalledWith(
        undefined,
        undefined,
        'country',
        'educationLevel',
      );
    });
  });

  describe('getPublicSummary', () => {
    it('delegates to service with parsed dates', async () => {
      const summary = { topItems: [] };
      service.getPublishedSummary.mockResolvedValue(summary as any);

      const result = await controller.getPublicSummary(
        '2026-04-01',
        '2026-04-30',
      );

      expect(service.getPublishedSummary).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
      );
      expect(result).toEqual(summary);
    });
  });

  // ============================================================
  // Admin endpoints — batch lifecycle
  // ============================================================

  describe('generateBatch', () => {
    it('returns the batch id wrapped in an object', async () => {
      service.generateBatch.mockResolvedValue('new-batch-id');

      const result = await controller.generateBatch('2026-04-01', '2026-04-30');

      expect(service.generateBatch).toHaveBeenCalledWith(
        new Date('2026-04-01'),
        new Date('2026-04-30'),
      );
      expect(result).toEqual({ batchId: 'new-batch-id' });
    });
  });

  describe('runDaily', () => {
    it('delegates to runDailyAggregation and wraps batchId', async () => {
      service.runDailyAggregation.mockResolvedValue('daily-batch-id');

      const result = await controller.runDaily();

      expect(service.runDailyAggregation).toHaveBeenCalled();
      expect(result).toEqual({ batchId: 'daily-batch-id' });
    });
  });

  describe('listBatches', () => {
    it('passes status filter to service', async () => {
      service.listBatches.mockResolvedValue([]);

      await controller.listBatches(ShoppingListAnalyticsBatchStatus.STAGING);

      expect(service.listBatches).toHaveBeenCalledWith(
        ShoppingListAnalyticsBatchStatus.STAGING,
      );
    });

    it('passes undefined when no status provided', async () => {
      service.listBatches.mockResolvedValue([]);

      await controller.listBatches();

      expect(service.listBatches).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getBatch', () => {
    it('delegates to service with batch id', async () => {
      const batch = { id: 'b1' };
      service.getBatch.mockResolvedValue(batch as any);

      const result = await controller.getBatch('b1');

      expect(service.getBatch).toHaveBeenCalledWith('b1');
      expect(result).toEqual(batch);
    });
  });

  describe('approveBatch', () => {
    it('passes batch id and admin user id to service', async () => {
      const approved = {
        id: 'b1',
        status: ShoppingListAnalyticsBatchStatus.APPROVED,
      };
      service.approveBatch.mockResolvedValue(approved as any);

      const result = await controller.approveBatch('b1', 'admin-1');

      expect(service.approveBatch).toHaveBeenCalledWith('b1', 'admin-1');
      expect(result).toEqual(approved);
    });
  });

  describe('publishBatch', () => {
    it('passes batch id and admin user id to service', async () => {
      const published = {
        id: 'b1',
        status: ShoppingListAnalyticsBatchStatus.PUBLISHED,
      };
      service.publishBatch.mockResolvedValue(published as any);

      const result = await controller.publishBatch('b1', 'admin-2');

      expect(service.publishBatch).toHaveBeenCalledWith('b1', 'admin-2');
      expect(result).toEqual(published);
    });
  });

  describe('rejectBatch', () => {
    it('passes batch id, admin user id and reason to service', async () => {
      const rejected = {
        id: 'b1',
        status: ShoppingListAnalyticsBatchStatus.REJECTED,
      };
      service.rejectBatch.mockResolvedValue(rejected as any);

      const result = await controller.rejectBatch(
        'b1',
        'admin-1',
        'low quality data',
      );

      expect(service.rejectBatch).toHaveBeenCalledWith(
        'b1',
        'admin-1',
        'low quality data',
      );
      expect(result).toEqual(rejected);
    });
  });

  describe('deleteBatch', () => {
    it('delegates to service and returns void (204 No Content)', async () => {
      service.deleteBatch.mockResolvedValue(undefined);

      const result = await controller.deleteBatch('b1');

      expect(service.deleteBatch).toHaveBeenCalledWith('b1');
      expect(result).toBeUndefined();
    });
  });
});
