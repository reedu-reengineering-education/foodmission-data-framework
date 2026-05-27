import { AnalyticsController } from './analytics.controller';
import { AnalyticsBatchCoordinator } from './analytics-batch-coordinator.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let coordinator: jest.Mocked<AnalyticsBatchCoordinator>;

  beforeEach(() => {
    coordinator = {
      generateForAll: jest.fn(),
      approveForAll: jest.fn(),
      publishForAll: jest.fn(),
    } as unknown as jest.Mocked<AnalyticsBatchCoordinator>;

    controller = new AnalyticsController(coordinator);
  });

  it('requires both dates when generating all analytics batches', async () => {
    await expect(
      controller.generateAllBatches(undefined, undefined),
    ).rejects.toThrow('periodStart and periodEnd are required');
  });

  it('parses dates and delegates to the coordinator', async () => {
    coordinator.generateForAll.mockResolvedValue({
      mealLogBatchId: 'meal-log-batch',
      shoppingListBatchId: 'shopping-list-batch',
    });

    const result = await controller.generateAllBatches(
      '2026-04-01',
      '2026-04-30',
    );

    expect(coordinator.generateForAll).toHaveBeenCalledWith(
      new Date('2026-04-01'),
      new Date('2026-04-30'),
    );
    expect(result).toEqual({
      mealLogBatchId: 'meal-log-batch',
      shoppingListBatchId: 'shopping-list-batch',
    });
  });

  it('requires both batch ids when approving all analytics batches', async () => {
    await expect(
      controller.approveAllBatches(undefined, undefined, 'admin-1'),
    ).rejects.toThrow('mealLogBatchId and shoppingListBatchId are required');
  });

  it('delegates approve-all to the coordinator', async () => {
    coordinator.approveForAll.mockResolvedValue({
      mealLogBatch: { id: 'meal-log-batch', status: 'APPROVED' },
      shoppingListBatch: { id: 'shopping-list-batch', status: 'APPROVED' },
    } as any);

    const result = await controller.approveAllBatches(
      'meal-log-batch',
      'shopping-list-batch',
      'admin-1',
    );

    expect(coordinator.approveForAll).toHaveBeenCalledWith(
      'meal-log-batch',
      'shopping-list-batch',
      'admin-1',
    );
    expect(result).toEqual({
      mealLogBatch: { id: 'meal-log-batch', status: 'APPROVED' },
      shoppingListBatch: { id: 'shopping-list-batch', status: 'APPROVED' },
    });
  });

  it('requires both batch ids when publishing all analytics batches', async () => {
    await expect(
      controller.publishAllBatches(undefined, undefined, 'admin-1'),
    ).rejects.toThrow('mealLogBatchId and shoppingListBatchId are required');
  });

  it('delegates publish-all to the coordinator', async () => {
    coordinator.publishForAll.mockResolvedValue({
      mealLogBatch: { id: 'meal-log-batch', status: 'PUBLISHED' },
      shoppingListBatch: { id: 'shopping-list-batch', status: 'PUBLISHED' },
    } as any);

    const result = await controller.publishAllBatches(
      'meal-log-batch',
      'shopping-list-batch',
      'admin-1',
    );

    expect(coordinator.publishForAll).toHaveBeenCalledWith(
      'meal-log-batch',
      'shopping-list-batch',
      'admin-1',
    );
    expect(result).toEqual({
      mealLogBatch: { id: 'meal-log-batch', status: 'PUBLISHED' },
      shoppingListBatch: { id: 'shopping-list-batch', status: 'PUBLISHED' },
    });
  });
});
