import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RulesService } from './rules.service';

/**
 * Fails missions and challenges whose rule window ended without the target.
 *
 * Rules are otherwise only re-scored when the user records an event, so an
 * item the user simply stopped working on would stay IN_PROGRESS forever.
 * Hourly is enough: a deadline is a day boundary, not a precise moment.
 */
@Injectable()
export class RulesDeadlineScheduler {
  private readonly logger = new Logger(RulesDeadlineScheduler.name);

  constructor(private readonly rulesService: RulesService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async resolveExpiredItems(now: Date = new Date()): Promise<void> {
    const userIds = await this.rulesService.findUsersWithExpiredItems(now);

    for (const userId of userIds) {
      try {
        await this.rulesService.evaluateUser(userId);
      } catch (error) {
        // One user's failure must not stop the rest of the run.
        this.logger.error(
          `Failed to resolve expired missions/challenges for user ${userId}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }

    if (userIds.length > 0) {
      this.logger.log(`Re-evaluated ${userIds.length} users past a deadline`);
    }
  }
}
