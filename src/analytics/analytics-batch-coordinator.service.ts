import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MealLogAnalyticsService } from './meal-log/services/meal-log-analytics.service';
import { ShoppingListAnalyticsService } from './shopping-list/services/shopping-list-analytics.service';

/**
 * Central cron coordinator for all analytics data types.
 *
 * A single @Cron fires once per day and calls each domain's
 * runDailyAggregation() sequentially — avoiding DB write contention.
 *
 * To add a new data type (e.g. recipes, pantry):
 *   1. Create the domain service with a `runDailyAggregation()` method.
 *   2. Inject it here and add a call inside runDailyForAll().
 *   3. Register the new service in analytics.module.ts.
 *   No extra @Cron needed.
 */
@Injectable()
export class AnalyticsBatchCoordinator {
  private readonly logger = new Logger(AnalyticsBatchCoordinator.name);

  constructor(
    private readonly mealLogService: MealLogAnalyticsService,
    private readonly shoppingListService: ShoppingListAnalyticsService,
  ) {}

  async generateForAll(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ mealLogBatchId: string; shoppingListBatchId: string }> {
    const mealLogBatchId = await this.mealLogService.generateBatch(
      periodStart,
      periodEnd,
    );
    const shoppingListBatchId = await this.shoppingListService.generateBatch(
      periodStart,
      periodEnd,
    );

    return { mealLogBatchId, shoppingListBatchId };
  }

  async approveForAll(
    mealLogBatchId: string,
    shoppingListBatchId: string,
    adminUserId: string,
  ) {
    const mealLogBatch = await this.mealLogService.approveBatch(
      mealLogBatchId,
      adminUserId,
    );
    const shoppingListBatch = await this.shoppingListService.approveBatch(
      shoppingListBatchId,
      adminUserId,
    );

    return { mealLogBatch, shoppingListBatch };
  }

  async publishForAll(
    mealLogBatchId: string,
    shoppingListBatchId: string,
    adminUserId: string,
  ) {
    const mealLogBatch = await this.mealLogService.publishBatch(
      mealLogBatchId,
      adminUserId,
    );
    const shoppingListBatch = await this.shoppingListService.publishBatch(
      shoppingListBatchId,
      adminUserId,
    );

    return { mealLogBatch, shoppingListBatch };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyForAll(): Promise<void> {
    const domains: Array<{
      name: string;
      service: { runDailyAggregation(): Promise<string> };
    }> = [
      { name: 'meal-log', service: this.mealLogService },
      { name: 'shopping-list', service: this.shoppingListService },
    ];

    for (const { name, service } of domains) {
      try {
        const batchId = await service.runDailyAggregation();
        this.logger.log(`[${name}] Daily batch generated: ${batchId}`);
      } catch (err) {
        this.logger.error(
          `[${name}] Daily aggregation failed — continuing with next domain`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
  }
}
