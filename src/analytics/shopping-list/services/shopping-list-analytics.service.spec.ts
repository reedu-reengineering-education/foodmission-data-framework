import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ShoppingListAnalyticsService } from './shopping-list-analytics.service';
import { ShoppingListAnalyticsRepository } from '../repositories/shopping-list-analytics.repository';
import { ShoppingListAnalyticsAggregator } from './shopping-list-analytics-aggregator.service';
import { Prisma } from '@prisma/client';

describe('ShoppingListAnalyticsService', () => {
  let service: ShoppingListAnalyticsService;
  let repository: jest.Mocked<ShoppingListAnalyticsRepository>;
  let aggregator: jest.Mocked<ShoppingListAnalyticsAggregator>;

  beforeEach(() => {
    repository = {
      createBatch: jest.fn(),
      findBatchById: jest.fn(),
      findBatches: jest.fn(),
      updateBatchStatus: jest.fn(),
      deleteBatch: jest.fn(),
      supersedeBatchesForPeriod: jest.fn().mockResolvedValue(undefined),
      insertItemPopularity: jest.fn(),
      insertCategoryPopularity: jest.fn(),
      insertListPatterns: jest.fn(),
      insertSustainability: jest.fn(),
      insertFoodGroups: jest.fn(),
      insertDemographicPatterns: jest.fn(),
      insertDemographicClassification: jest.fn(),
      insertCrossDimPatterns: jest.fn(),
      insertCrossDimClassification: jest.fn(),
      getPublishedItemPopularity: jest.fn(),
      getPublishedCategoryPopularity: jest.fn(),
      getPublishedListPatterns: jest.fn(),
      getPublishedSustainability: jest.fn(),
      getPublishedFoodGroups: jest.fn(),
      getPublishedDemographicPatterns: jest.fn(),
      getPublishedDemographicClassification: jest.fn(),
      getPublishedCrossDimPatterns: jest.fn(),
      getPublishedCrossDimClassification: jest.fn(),
    } as unknown as jest.Mocked<ShoppingListAnalyticsRepository>;

    aggregator = {
      aggregate: jest.fn(),
    } as unknown as jest.Mocked<ShoppingListAnalyticsAggregator>;

    service = new ShoppingListAnalyticsService(repository, aggregator);
  });

  // ============================================================
  // generateBatch
  // ============================================================

  describe('generateBatch', () => {
    const emptyAggResult = {
      itemPopularity: [],
      categoryPopularity: [],
      listPatterns: [],
      sustainability: [],
      foodGroups: [],
      demographicPatterns: [],
      demographicClassification: [],
      crossDimPatterns: [],
      crossDimClassification: [],
      totalRecords: 0,
      suppressedGroups: 0,
    };

    it('creates a batch and returns its id', async () => {
      aggregator.aggregate.mockResolvedValue(emptyAggResult);
      repository.createBatch.mockResolvedValue({ id: 'batch-1' } as any);

      const id = await service.generateBatch(
        new Date('2026-04-01'),
        new Date('2026-04-02'),
      );

      expect(id).toBe('batch-1');
      expect(repository.createBatch).toHaveBeenCalledWith(
        expect.objectContaining({ periodStart: new Date('2026-04-01') }),
      );
    });

    it('calls bulk inserts only for non-empty result arrays', async () => {
      aggregator.aggregate.mockResolvedValue({
        ...emptyAggResult,
        itemPopularity: [
          {
            date: new Date(),
            foodName: 'Milk',
            foodGroup: 'Dairy',
            itemType: 'food_product',
            frequency: 5,
            uniqueUsers: 5,
            avgQuantity: 1,
            predominantUnit: 'PIECES',
          },
        ],
        totalRecords: 1,
      });
      repository.createBatch.mockResolvedValue({ id: 'batch-2' } as any);
      repository.insertItemPopularity.mockResolvedValue(undefined as any);

      await service.generateBatch(
        new Date('2026-04-01'),
        new Date('2026-04-02'),
      );

      expect(repository.insertItemPopularity).toHaveBeenCalledTimes(1);
      expect(repository.insertCategoryPopularity).not.toHaveBeenCalled();
      expect(repository.insertListPatterns).not.toHaveBeenCalled();
    });

    it('passes Prisma.JsonNull for null JSON sustainability fields', async () => {
      aggregator.aggregate.mockResolvedValue({
        ...emptyAggResult,
        sustainability: [
          {
            date: new Date(),
            userCount: 5,
            itemCount: 3,
            avgCarbonFootprint: null,
            nutriScoreDistribution: null,
            ecoScoreDistribution: null,
            novaDistribution: null,
            vegetarianItemPct: null,
            veganItemPct: null,
            avgUltraProcessedPct: null,
            p25UltraProcessedPct: null,
            p50UltraProcessedPct: null,
            p75UltraProcessedPct: null,
          },
        ],
        totalRecords: 1,
      });
      repository.createBatch.mockResolvedValue({ id: 'batch-3' } as any);
      repository.insertSustainability.mockResolvedValue(undefined as any);

      await service.generateBatch(
        new Date('2026-04-01'),
        new Date('2026-04-02'),
      );

      const insertArg = repository.insertSustainability.mock.calls[0][0][0];
      // Prisma.JsonNull is the typed sentinel Prisma uses for explicit null in JSON fields
      expect(insertArg.nutriScoreDistribution).toBe(Prisma.JsonNull);
    });
  });

  // ============================================================
  // runDailyAggregation
  // ============================================================

  describe('runDailyAggregation', () => {
    const emptyAggResult = {
      itemPopularity: [],
      categoryPopularity: [],
      listPatterns: [],
      sustainability: [],
      foodGroups: [],
      demographicPatterns: [],
      demographicClassification: [],
      crossDimPatterns: [],
      crossDimClassification: [],
      totalRecords: 0,
      suppressedGroups: 0,
    };

    beforeEach(() => {
      aggregator.aggregate.mockResolvedValue(emptyAggResult);
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

  // ============================================================
  // Batch lifecycle — approveBatch
  // ============================================================

  describe('approveBatch', () => {
    it('approves a STAGING batch', async () => {
      const batch = {
        id: 'b1',
        status: 'STAGING',
      };
      const approved = {
        ...batch,
        status: 'APPROVED',
      };
      repository.findBatchById.mockResolvedValue(batch as any);
      repository.updateBatchStatus.mockResolvedValue(approved as any);

      const result = await service.approveBatch('b1', 'admin-1');

      expect(repository.updateBatchStatus).toHaveBeenCalledWith(
        'b1',
        'APPROVED',
        'admin-1',
      );
      expect(result.status).toBe('APPROVED');
    });

    it('throws BadRequestException for a non-STAGING batch', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: 'PUBLISHED',
      } as any);

      await expect(service.approveBatch('b1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when batch does not exist', async () => {
      repository.findBatchById.mockResolvedValue(null);

      await expect(service.approveBatch('missing', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================
  // publishBatch
  // ============================================================

  describe('publishBatch', () => {
    it('publishes an APPROVED batch', async () => {
      const batch = {
        id: 'b1',
        status: 'APPROVED',
      };
      const published = {
        ...batch,
        status: 'PUBLISHED',
      };
      repository.findBatchById.mockResolvedValue(batch as any);
      repository.updateBatchStatus.mockResolvedValue(published as any);

      const result = await service.publishBatch('b1', 'admin-1');

      expect(repository.updateBatchStatus).toHaveBeenCalledWith(
        'b1',
        'PUBLISHED',
        'admin-1',
      );
      expect(result.status).toBe('PUBLISHED');
    });

    it('throws BadRequestException when batch is not APPROVED', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: 'STAGING',
      } as any);

      await expect(service.publishBatch('b1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // rejectBatch
  // ============================================================

  describe('rejectBatch', () => {
    it('rejects a STAGING batch', async () => {
      const batch = {
        id: 'b1',
        status: 'STAGING',
      };
      const rejected = {
        ...batch,
        status: 'REJECTED',
      };
      repository.findBatchById.mockResolvedValue(batch as any);
      repository.updateBatchStatus.mockResolvedValue(rejected as any);

      const result = await service.rejectBatch('b1', 'admin-1', 'bad data');

      expect(repository.updateBatchStatus).toHaveBeenCalledWith(
        'b1',
        'REJECTED',
        'admin-1',
        'bad data',
      );
      expect(result.status).toBe('REJECTED');
    });

    it('throws BadRequestException when batch is not STAGING', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: 'PUBLISHED',
      } as any);

      await expect(
        service.rejectBatch('b1', 'admin-1', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // deleteBatch
  // ============================================================

  describe('deleteBatch', () => {
    it('deletes a STAGING batch', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: 'STAGING',
      } as any);
      repository.deleteBatch.mockResolvedValue(undefined);

      await service.deleteBatch('b1');

      expect(repository.deleteBatch).toHaveBeenCalledWith('b1');
    });

    it('deletes a REJECTED batch', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: 'REJECTED',
      } as any);
      repository.deleteBatch.mockResolvedValue(undefined);

      await service.deleteBatch('b1');

      expect(repository.deleteBatch).toHaveBeenCalledWith('b1');
    });

    it('throws BadRequestException for PUBLISHED batches', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: 'PUBLISHED',
      } as any);

      await expect(service.deleteBatch('b1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for APPROVED batches', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: 'APPROVED',
      } as any);

      await expect(service.deleteBatch('b1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // getPublishedDemographicClassification
  // ============================================================

  describe('getPublishedDemographicClassification', () => {
    it('delegates to repository without filter', async () => {
      repository.getPublishedDemographicClassification.mockResolvedValue([]);

      await service.getPublishedDemographicClassification();

      expect(
        repository.getPublishedDemographicClassification,
      ).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('passes dates and dimension to repository', async () => {
      repository.getPublishedDemographicClassification.mockResolvedValue([]);
      const from = new Date('2026-04-01');
      const to = new Date('2026-04-30');

      await service.getPublishedDemographicClassification(from, to, 'ageGroup');

      expect(
        repository.getPublishedDemographicClassification,
      ).toHaveBeenCalledWith(from, to, 'ageGroup');
    });
  });

  // ============================================================
  // getPublishedCrossDimClassification
  // ============================================================

  describe('getPublishedCrossDimClassification', () => {
    it('delegates to repository without filters', async () => {
      repository.getPublishedCrossDimClassification.mockResolvedValue([]);

      await service.getPublishedCrossDimClassification();

      expect(
        repository.getPublishedCrossDimClassification,
      ).toHaveBeenCalledWith(undefined, undefined, undefined, undefined);
    });

    it('passes dates and dim filters to repository', async () => {
      repository.getPublishedCrossDimClassification.mockResolvedValue([]);
      const from = new Date('2026-04-01');
      const to = new Date('2026-04-30');

      await service.getPublishedCrossDimClassification(
        from,
        to,
        'ageGroup',
        'gender',
      );

      expect(
        repository.getPublishedCrossDimClassification,
      ).toHaveBeenCalledWith(from, to, 'ageGroup', 'gender');
    });
  });

  // ============================================================
  // getPublishedSummary
  // ============================================================

  describe('getPublishedSummary', () => {
    it('returns canonical summary blocks and aggregated stats', async () => {
      repository.getPublishedItemPopularity.mockResolvedValue([
        { foodName: 'Milk', frequency: 10, uniqueUsers: 8 } as any,
      ]);
      repository.getPublishedCategoryPopularity.mockResolvedValue([
        { category: 'Dairy', frequency: 10, uniqueUsers: 8 } as any,
      ]);
      repository.getPublishedListPatterns.mockResolvedValue([
        {
          date: new Date('2026-04-01'),
          totalLists: 9,
          foodProductPct: 70,
          avgItemsPerList: 4,
          avgListsPerUser: 2,
        } as any,
        {
          date: new Date('2026-04-02'),
          totalLists: 11,
          foodProductPct: 50,
          avgItemsPerList: 6,
          avgListsPerUser: 3,
        } as any,
      ]);
      repository.getPublishedSustainability.mockResolvedValue([
        {
          avgSustainabilityScore: 55,
          avgCarbonFootprint: 2.5,
          vegetarianItemPct: 60,
          avgUltraProcessedPct: 20,
          p25UltraProcessedPct: 0,
          p50UltraProcessedPct: 0,
          p75UltraProcessedPct: 100,
        } as any,
        {
          avgSustainabilityScore: null,
          avgCarbonFootprint: null,
          vegetarianItemPct: null,
          avgUltraProcessedPct: 40,
          p25UltraProcessedPct: 0,
          p50UltraProcessedPct: 50,
          p75UltraProcessedPct: 100,
        } as any,
      ]);

      const result = await service.getPublishedSummary();

      expect(result.topItems).toEqual([
        {
          itemName: 'Milk',
          itemGroup: undefined,
          itemType: undefined,
          frequency: 10,
          uniqueUsers: 8,
        },
      ]);
      expect(result.topCategories).toEqual([
        { category: 'Dairy', frequency: 10, uniqueUsers: 8 },
      ]);
      expect(result.patterns.avgItemsPerEntity).toBe(5);
      expect(result.patterns.avgPantryPct).toBe(60);
      expect(result).not.toHaveProperty('nutrition');
      expect(result.sustainability.avgCarbonFootprint).toBe(2.5); // null excluded
      expect(result.sustainability.avgSustainabilityScore).toBeNull();
      expect(result.classification.avgVegetarianPct).toBe(60);
      expect(result.classification.avgUltraProcessedPct).toBe(30);
    });

    it('returns nulls when there is no published data', async () => {
      repository.getPublishedItemPopularity.mockResolvedValue([]);
      repository.getPublishedCategoryPopularity.mockResolvedValue([]);
      repository.getPublishedListPatterns.mockResolvedValue([]);
      repository.getPublishedSustainability.mockResolvedValue([]);

      const result = await service.getPublishedSummary();

      expect(result.topItems).toHaveLength(0);
      expect(result.patterns.avgItemsPerEntity).toBeNull();
      expect(result).not.toHaveProperty('nutrition');
      expect(result.sustainability.avgCarbonFootprint).toBeNull();
    });

    it('returns null period when from/to not provided', async () => {
      repository.getPublishedItemPopularity.mockResolvedValue([]);
      repository.getPublishedCategoryPopularity.mockResolvedValue([]);
      repository.getPublishedListPatterns.mockResolvedValue([
        {
          date: new Date('2026-04-01'),
          avgItemsPerList: 3,
          avgListsPerUser: 1,
        } as any,
        {
          date: new Date('2026-04-30'),
          avgItemsPerList: 4,
          avgListsPerUser: 1,
        } as any,
      ]);
      repository.getPublishedSustainability.mockResolvedValue([]);

      const result = await service.getPublishedSummary();

      expect(result.period.from).toBeNull();
      expect(result.period.to).toBeNull();
    });

    it('reflects provided from/to in period', async () => {
      repository.getPublishedItemPopularity.mockResolvedValue([]);
      repository.getPublishedCategoryPopularity.mockResolvedValue([]);
      repository.getPublishedListPatterns.mockResolvedValue([]);
      repository.getPublishedSustainability.mockResolvedValue([]);

      const from = new Date('2026-04-01');
      const to = new Date('2026-04-30');
      const result = await service.getPublishedSummary(from, to);

      expect(result.period.from).toEqual(from);
      expect(result.period.to).toEqual(to);
    });
  });

  // ============================================================
  // getBatch
  // ============================================================

  describe('getBatch', () => {
    it('returns the batch when found', async () => {
      const batch = {
        id: 'b1',
        status: 'STAGING',
      };
      repository.findBatchById.mockResolvedValue(batch as any);

      const result = await service.getBatch('b1');

      expect(result).toEqual(batch);
    });

    it('throws NotFoundException when batch is not found', async () => {
      repository.findBatchById.mockResolvedValue(null);

      await expect(service.getBatch('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
