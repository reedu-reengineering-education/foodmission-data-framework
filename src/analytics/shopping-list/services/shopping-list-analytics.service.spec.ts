import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ShoppingListAnalyticsService } from './shopping-list-analytics.service';
import { ShoppingListAnalyticsRepository } from '../repositories/shopping-list-analytics.repository';
import { ShoppingListAnalyticsAggregator } from './shopping-list-analytics-aggregator.service';
import { ShoppingListAnalyticsBatchStatus } from '@prisma/client';

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
      insertItemPopularity: jest.fn(),
      insertCategoryPopularity: jest.fn(),
      insertListPatterns: jest.fn(),
      insertNutritionProfile: jest.fn(),
      insertSustainability: jest.fn(),
      insertFoodGroups: jest.fn(),
      insertDemographicPatterns: jest.fn(),
      insertDemographicNutrition: jest.fn(),
      insertCrossDimPatterns: jest.fn(),
      insertCrossDimNutrition: jest.fn(),
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
      nutritionProfile: [],
      sustainability: [],
      foodGroups: [],
      demographicPatterns: [],
      demographicNutrition: [],
      crossDimPatterns: [],
      crossDimNutrition: [],
      totalRecords: 0,
      suppressedGroups: 0,
    };

    it('creates a batch and returns its id', async () => {
      aggregator.aggregate.mockResolvedValue(emptyAggResult as any);
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
          { date: new Date(), foodName: 'Milk', foodGroup: 'Dairy', itemType: 'food_product', frequency: 5, uniqueUsers: 5, avgQuantity: 1, predominantUnit: 'PIECES' },
        ],
        totalRecords: 1,
      } as any);
      repository.createBatch.mockResolvedValue({ id: 'batch-2' } as any);
      repository.insertItemPopularity.mockResolvedValue(undefined as any);

      await service.generateBatch(new Date('2026-04-01'), new Date('2026-04-02'));

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
          },
        ],
        totalRecords: 1,
      } as any);
      repository.createBatch.mockResolvedValue({ id: 'batch-3' } as any);
      repository.insertSustainability.mockResolvedValue(undefined as any);

      await service.generateBatch(new Date('2026-04-01'), new Date('2026-04-02'));

      const insertArg = repository.insertSustainability.mock.calls[0][0][0];
      // Prisma.JsonNull is the symbol Prisma uses; verify it's not a plain null
      expect(insertArg.nutriScoreDistribution).not.toBeNull();
    });
  });

  // ============================================================
  // Batch lifecycle — approveBatch
  // ============================================================

  describe('approveBatch', () => {
    it('approves a STAGING batch', async () => {
      const batch = { id: 'b1', status: ShoppingListAnalyticsBatchStatus.STAGING };
      const approved = { ...batch, status: ShoppingListAnalyticsBatchStatus.APPROVED };
      repository.findBatchById.mockResolvedValue(batch as any);
      repository.updateBatchStatus.mockResolvedValue(approved as any);

      const result = await service.approveBatch('b1', 'admin-1');

      expect(repository.updateBatchStatus).toHaveBeenCalledWith(
        'b1',
        ShoppingListAnalyticsBatchStatus.APPROVED,
        'admin-1',
      );
      expect(result.status).toBe(ShoppingListAnalyticsBatchStatus.APPROVED);
    });

    it('throws BadRequestException for a non-STAGING batch', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: ShoppingListAnalyticsBatchStatus.PUBLISHED,
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
      const batch = { id: 'b1', status: ShoppingListAnalyticsBatchStatus.APPROVED };
      const published = { ...batch, status: ShoppingListAnalyticsBatchStatus.PUBLISHED };
      repository.findBatchById.mockResolvedValue(batch as any);
      repository.updateBatchStatus.mockResolvedValue(published as any);

      const result = await service.publishBatch('b1', 'admin-1');

      expect(repository.updateBatchStatus).toHaveBeenCalledWith(
        'b1',
        ShoppingListAnalyticsBatchStatus.PUBLISHED,
        'admin-1',
      );
      expect(result.status).toBe(ShoppingListAnalyticsBatchStatus.PUBLISHED);
    });

    it('throws BadRequestException when batch is not APPROVED', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: ShoppingListAnalyticsBatchStatus.STAGING,
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
      const batch = { id: 'b1', status: ShoppingListAnalyticsBatchStatus.STAGING };
      const rejected = { ...batch, status: ShoppingListAnalyticsBatchStatus.REJECTED };
      repository.findBatchById.mockResolvedValue(batch as any);
      repository.updateBatchStatus.mockResolvedValue(rejected as any);

      const result = await service.rejectBatch('b1', 'admin-1', 'bad data');

      expect(repository.updateBatchStatus).toHaveBeenCalledWith(
        'b1',
        ShoppingListAnalyticsBatchStatus.REJECTED,
        'admin-1',
        'bad data',
      );
      expect(result.status).toBe(ShoppingListAnalyticsBatchStatus.REJECTED);
    });

    it('throws BadRequestException when batch is not STAGING', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: ShoppingListAnalyticsBatchStatus.PUBLISHED,
      } as any);

      await expect(service.rejectBatch('b1', 'admin-1', 'reason')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // deleteBatch
  // ============================================================

  describe('deleteBatch', () => {
    it('deletes a STAGING batch', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: ShoppingListAnalyticsBatchStatus.STAGING,
      } as any);
      repository.deleteBatch.mockResolvedValue(undefined);

      await service.deleteBatch('b1');

      expect(repository.deleteBatch).toHaveBeenCalledWith('b1');
    });

    it('deletes a REJECTED batch', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: ShoppingListAnalyticsBatchStatus.REJECTED,
      } as any);
      repository.deleteBatch.mockResolvedValue(undefined);

      await service.deleteBatch('b1');

      expect(repository.deleteBatch).toHaveBeenCalledWith('b1');
    });

    it('throws BadRequestException for PUBLISHED batches', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: ShoppingListAnalyticsBatchStatus.PUBLISHED,
      } as any);

      await expect(service.deleteBatch('b1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for APPROVED batches', async () => {
      repository.findBatchById.mockResolvedValue({
        id: 'b1',
        status: ShoppingListAnalyticsBatchStatus.APPROVED,
      } as any);

      await expect(service.deleteBatch('b1')).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // getPublishedSummary
  // ============================================================

  describe('getPublishedSummary', () => {
    it('returns top items, top categories, and aggregated stats', async () => {
      repository.getPublishedItemPopularity.mockResolvedValue([
        { foodName: 'Milk', frequency: 10, uniqueUsers: 8 } as any,
      ]);
      repository.getPublishedCategoryPopularity.mockResolvedValue([
        { category: 'Dairy', frequency: 10, uniqueUsers: 8 } as any,
      ]);
      repository.getPublishedListPatterns.mockResolvedValue([
        { date: new Date('2026-04-01'), avgItemsPerList: 4, avgListsPerUser: 2 } as any,
        { date: new Date('2026-04-02'), avgItemsPerList: 6, avgListsPerUser: 3 } as any,
      ]);
      repository.getPublishedNutritionProfile.mockResolvedValue([
        { date: new Date('2026-04-02'), avgCaloriesPer100g: 80, avgProteinsPer100g: 5 } as any,
      ]);
      repository.getPublishedSustainability.mockResolvedValue([
        { avgCarbonFootprint: 2.5, vegetarianItemPct: 60, avgUltraProcessedPct: 20 } as any,
        { avgCarbonFootprint: null, vegetarianItemPct: null, avgUltraProcessedPct: 40 } as any,
      ]);

      const result = await service.getPublishedSummary();

      expect(result.topItems).toEqual([
        { name: 'Milk', frequency: 10, uniqueUsers: 8 },
      ]);
      expect(result.topCategories).toEqual([
        { category: 'Dairy', frequency: 10, uniqueUsers: 8 },
      ]);
      expect(result.listPatterns.avgItemsPerList).toBe(5); // (4+6)/2
      expect(result.listPatterns.avgListsPerUser).toBe(2.5); // (2+3)/2
      expect(result.nutritionProfile.latestAvgCaloriesPer100g).toBe(80);
      expect(result.sustainability.avgCarbonFootprint).toBe(2.5); // null excluded
      expect(result.sustainability.avgVegetarianItemPct).toBe(60); // null excluded
      expect(result.sustainability.avgUltraProcessedPct).toBe(30); // (20+40)/2
    });

    it('returns nulls when there is no published data', async () => {
      repository.getPublishedItemPopularity.mockResolvedValue([]);
      repository.getPublishedCategoryPopularity.mockResolvedValue([]);
      repository.getPublishedListPatterns.mockResolvedValue([]);
      repository.getPublishedNutritionProfile.mockResolvedValue([]);
      repository.getPublishedSustainability.mockResolvedValue([]);

      const result = await service.getPublishedSummary();

      expect(result.topItems).toHaveLength(0);
      expect(result.listPatterns.avgItemsPerList).toBeNull();
      expect(result.nutritionProfile.latestAvgCaloriesPer100g).toBeNull();
      expect(result.sustainability.avgCarbonFootprint).toBeNull();
    });

    it('derives period from listPatterns when not provided', async () => {
      repository.getPublishedItemPopularity.mockResolvedValue([]);
      repository.getPublishedCategoryPopularity.mockResolvedValue([]);
      repository.getPublishedListPatterns.mockResolvedValue([
        { date: new Date('2026-04-01'), avgItemsPerList: 3, avgListsPerUser: 1 } as any,
        { date: new Date('2026-04-30'), avgItemsPerList: 4, avgListsPerUser: 1 } as any,
      ]);
      repository.getPublishedNutritionProfile.mockResolvedValue([]);
      repository.getPublishedSustainability.mockResolvedValue([]);

      const result = await service.getPublishedSummary();

      expect(result.period.from).toEqual(new Date('2026-04-01'));
      expect(result.period.to).toEqual(new Date('2026-04-30'));
    });
  });

  // ============================================================
  // getBatch
  // ============================================================

  describe('getBatch', () => {
    it('returns the batch when found', async () => {
      const batch = { id: 'b1', status: ShoppingListAnalyticsBatchStatus.STAGING };
      repository.findBatchById.mockResolvedValue(batch as any);

      const result = await service.getBatch('b1');

      expect(result).toEqual(batch);
    });

    it('throws NotFoundException when batch is not found', async () => {
      repository.findBatchById.mockResolvedValue(null);

      await expect(service.getBatch('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
