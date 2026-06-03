import { ShoppingListAnalyticsController } from './shopping-list-analytics.controller';
import { ShoppingListAnalyticsService } from '../services/shopping-list-analytics.service';

describe('ShoppingListAnalyticsController', () => {
  let controller: ShoppingListAnalyticsController;
  let service: jest.Mocked<ShoppingListAnalyticsService>;

  beforeEach(() => {
    service = {
      getPublishedItemPopularity: jest.fn(),
      getPublishedDemographicPatterns: jest.fn(),
      generateBatch: jest.fn(),
      approveBatch: jest.fn(),
    } as unknown as jest.Mocked<ShoppingListAnalyticsService>;

    controller = new ShoppingListAnalyticsController(service);
  });

  it('parses date strings and applies the default popularity limit', async () => {
    service.getPublishedItemPopularity.mockResolvedValue([]);

    await controller.getPublicItemPopularity('2026-04-01', '2026-04-30');

    expect(service.getPublishedItemPopularity).toHaveBeenCalledWith(
      new Date('2026-04-01'),
      new Date('2026-04-30'),
      20,
    );
  });

  it('parses custom popularity limits', async () => {
    service.getPublishedItemPopularity.mockResolvedValue([]);

    await controller.getPublicItemPopularity(undefined, undefined, '5');

    expect(service.getPublishedItemPopularity).toHaveBeenCalledWith(
      undefined,
      undefined,
      5,
    );
  });

  it('throws for invalid public date filters', () => {
    expect(() => controller.getPublicItemPopularity('not-a-date')).toThrow(
      'Invalid date',
    );
  });

  it('forwards optional demographic dimension filters', async () => {
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

  it('requires both dates when generating a batch', async () => {
    await expect(
      controller.generateBatch(undefined, undefined),
    ).rejects.toThrow('periodStart and periodEnd are required');
  });

  it('parses generation dates and wraps the batch id', async () => {
    service.generateBatch.mockResolvedValue('new-batch-id');

    const result = await controller.generateBatch('2026-04-01', '2026-04-30');

    expect(service.generateBatch).toHaveBeenCalledWith(
      new Date('2026-04-01'),
      new Date('2026-04-30'),
    );
    expect(result).toEqual({ batchId: 'new-batch-id' });
  });

  it('delegates admin approval with batch id and user id', async () => {
    const approved = { id: 'b1', status: 'APPROVED' };
    service.approveBatch.mockResolvedValue(approved as any);

    const result = await controller.approveBatch('b1', 'admin-1');

    expect(service.approveBatch).toHaveBeenCalledWith('b1', 'admin-1');
    expect(result).toEqual(approved);
  });
});
