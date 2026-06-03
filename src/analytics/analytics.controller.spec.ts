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

  it('requires both dates when generating an analytics run', async () => {
    await expect(controller.generateRun(undefined, undefined)).rejects.toThrow(
      'periodStart and periodEnd are required',
    );
  });

  it('parses dates and delegates to the coordinator', async () => {
    coordinator.generateForAll.mockResolvedValue({
      mealLogBatchId: 'meal-log-batch',
      shoppingListBatchId: 'shopping-list-batch',
    });

    const result = await controller.generateRun('2026-04-01', '2026-04-30');

    expect(coordinator.generateForAll).toHaveBeenCalledWith(
      new Date('2026-04-01'),
      new Date('2026-04-30'),
    );
    expect(result).toEqual({
      mealLogBatchId: 'meal-log-batch',
      shoppingListBatchId: 'shopping-list-batch',
      runId: expect.any(String),
    });
  });

  it('approves a run using runId', async () => {
    coordinator.approveForAll.mockResolvedValue({
      mealLogBatch: { id: 'meal-log-batch', status: 'APPROVED' },
      shoppingListBatch: { id: 'shopping-list-batch', status: 'APPROVED' },
    } as any);
    const runId = Buffer.from(
      JSON.stringify({
        mealLogBatchId: 'meal-log-batch',
        shoppingListBatchId: 'shopping-list-batch',
      }),
    ).toString('base64url');

    const result = await controller.approveRun(runId, 'admin-1');

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

  it('publishes a run using runId', async () => {
    coordinator.publishForAll.mockResolvedValue({
      mealLogBatch: { id: 'meal-log-batch', status: 'PUBLISHED' },
      shoppingListBatch: { id: 'shopping-list-batch', status: 'PUBLISHED' },
    } as any);
    const runId = Buffer.from(
      JSON.stringify({
        mealLogBatchId: 'meal-log-batch',
        shoppingListBatchId: 'shopping-list-batch',
      }),
    ).toString('base64url');

    const result = await controller.publishRun(runId, 'admin-1');

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

  it('rejects invalid runId for approveRun', async () => {
    await expect(controller.approveRun('not-valid', 'admin-1')).rejects.toThrow(
      'Invalid runId',
    );
  });

  it('rejects invalid runId for publishRun', async () => {
    await expect(controller.publishRun('not-valid', 'admin-1')).rejects.toThrow(
      'Invalid runId',
    );
  });
});
