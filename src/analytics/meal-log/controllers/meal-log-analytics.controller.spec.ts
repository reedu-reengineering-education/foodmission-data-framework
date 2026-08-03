import { MealLogAnalyticsController } from './meal-log-analytics.controller';
import { MealLogAnalyticsService } from '../services/meal-log-analytics.service';

describe('MealLogAnalyticsController', () => {
  let controller: MealLogAnalyticsController;
  let service: jest.Mocked<MealLogAnalyticsService>;

  beforeEach(() => {
    service = {
      getPublishedNutrition: jest.fn(),
      getPublishedPopularity: jest.fn(),
      generateBatch: jest.fn(),
      listBatches: jest.fn(),
    } as unknown as jest.Mocked<MealLogAnalyticsService>;

    controller = new MealLogAnalyticsController(service);
  });

  it('parses date and typeOfMeal filters for public nutrition', async () => {
    service.getPublishedNutrition.mockResolvedValue([]);

    await controller.getPublicNutrition('2026-04-01', '2026-04-30', 'DINNER');

    expect(service.getPublishedNutrition).toHaveBeenCalledWith(
      new Date('2026-04-01'),
      new Date('2026-04-30'),
      'DINNER',
    );
  });

  it('parses limit and forwards dates for unified popularity', async () => {
    service.getPublishedPopularity.mockResolvedValue([]);

    await controller.getPublicPopularity('2026-04-01', '2026-04-30', '5');

    expect(service.getPublishedPopularity).toHaveBeenCalledWith(
      new Date('2026-04-01'),
      new Date('2026-04-30'),
      5,
    );
  });

  it('throws for invalid public date filters', async () => {
    await expect(controller.getPublicNutrition('not-a-date')).rejects.toThrow(
      'Invalid date',
    );
  });

  it('requires both dates when generating a batch', async () => {
    await expect(
      controller.generateBatch(undefined, undefined),
    ).rejects.toThrow('periodStart and periodEnd are required');
  });

  it('parses generation dates and wraps the batch id', async () => {
    service.generateBatch.mockResolvedValue('new-batch');

    const result = await controller.generateBatch('2026-04-01', '2026-04-30');

    expect(service.generateBatch).toHaveBeenCalledWith(
      new Date('2026-04-01'),
      new Date('2026-04-30'),
    );
    expect(result).toEqual({ batchId: 'new-batch' });
  });

  it('passes optional batch status to the service', async () => {
    service.listBatches.mockResolvedValue([]);

    await controller.listBatches('STAGING');

    expect(service.listBatches).toHaveBeenCalledWith('STAGING');
  });
});
