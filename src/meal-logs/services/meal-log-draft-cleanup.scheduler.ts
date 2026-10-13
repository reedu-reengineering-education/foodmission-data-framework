import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MealLogsRepository } from '../repositories/meal-logs.repository';

/** How long a staged meal log waits for review before it is discarded. */
export const MEAL_LOG_DRAFT_TTL_DAYS = 7;

/**
 * Deletes staged meal logs nobody confirmed. A draft never recorded events,
 * so removing it leaves nothing behind on the ledger.
 */
@Injectable()
export class MealLogDraftCleanupScheduler {
  private readonly logger = new Logger(MealLogDraftCleanupScheduler.name);

  constructor(private readonly mealLogRepository: MealLogsRepository) {}

  @Cron(CronExpression.EVERY_HOUR)
  async deleteStaleDrafts(now: Date = new Date()): Promise<number> {
    const before = new Date(now);
    before.setDate(before.getDate() - MEAL_LOG_DRAFT_TTL_DAYS);
    try {
      const count =
        await this.mealLogRepository.deleteDraftsCreatedBefore(before);
      if (count > 0) {
        this.logger.log(`Deleted ${count} unconfirmed meal log drafts`);
      }
      return count;
    } catch (error) {
      this.logger.error(
        'Failed to delete stale meal log drafts',
        error instanceof Error ? error.stack : error,
      );
      return 0;
    }
  }
}
