import { Controller, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InsightQueryDto } from '../../shared/insight-query.dto';
import { InsightRunner } from '../../shared/insight-runner.service';
import { AdminInsight } from '../admin-insight.decorator';
import { FEATURE_USAGE_INSIGHT } from './feature-usage.insight';
import { SESSIONS_INSIGHT } from './sessions.insight';
import { USERS_INSIGHT } from './users.insight';
import { WEEKLY_ACTIVITY_INSIGHT } from './weekly-activity.insight';

/** Admin-only live usage insights. */
@ApiTags('analytics-admin')
@Controller('analytics/admin/usage')
export class AdminUsageController {
  constructor(private readonly insights: InsightRunner) {}

  @AdminInsight(USERS_INSIGHT)
  users(@Query() query: InsightQueryDto) {
    return this.insights.run(USERS_INSIGHT, query);
  }

  @AdminInsight(WEEKLY_ACTIVITY_INSIGHT)
  weeklyActivity(@Query() query: InsightQueryDto) {
    return this.insights.run(WEEKLY_ACTIVITY_INSIGHT, query);
  }

  @AdminInsight(SESSIONS_INSIGHT)
  sessions(@Query() query: InsightQueryDto) {
    return this.insights.run(SESSIONS_INSIGHT, query);
  }

  @AdminInsight(FEATURE_USAGE_INSIGHT)
  featureUsage(@Query() query: InsightQueryDto) {
    return this.insights.run(FEATURE_USAGE_INSIGHT, query);
  }
}
