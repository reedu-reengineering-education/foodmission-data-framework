import { Controller, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InsightQueryDto } from '../../shared/insight-query.dto';
import { InsightRunner } from '../../shared/insight-runner.service';
import { AdminInsight } from '../admin-insight.decorator';
import { BADGE_EARNS_INSIGHT, BADGES_INSIGHT } from './badges.insight';
import { DIMENSION_FOCUS_INSIGHT } from './dimension-focus.insight';
import { DIMENSION_LEVEL_UPS_INSIGHT } from './dimension-level-ups.insight';
import { DIMENSION_LEVELS_INSIGHT } from './dimension-levels.insight';
import { FOOD_FACTS_READ_INSIGHT } from './food-facts-read.insight';
import {
  CHALLENGE_PROGRESS_INSIGHT,
  MISSION_PROGRESS_INSIGHT,
} from './item-progress.insight';
import { QUEST_PROGRESS_INSIGHT } from './quest-progress.insight';
import { QUIZ_RESULTS_INSIGHT } from './quiz-results.insight';
import { XP_DISTRIBUTION_INSIGHT, XP_SOURCES_INSIGHT } from './xp.insight';

/** Admin-only live learning and gamification insights. */
@ApiTags('analytics-admin')
@Controller('analytics/admin/learning')
export class AdminLearningController {
  constructor(private readonly insights: InsightRunner) {}

  @AdminInsight(DIMENSION_LEVELS_INSIGHT)
  dimensionLevels(@Query() query: InsightQueryDto) {
    return this.insights.run(DIMENSION_LEVELS_INSIGHT, query);
  }

  @AdminInsight(DIMENSION_FOCUS_INSIGHT)
  dimensionFocus(@Query() query: InsightQueryDto) {
    return this.insights.run(DIMENSION_FOCUS_INSIGHT, query);
  }

  @AdminInsight(DIMENSION_LEVEL_UPS_INSIGHT)
  dimensionLevelUps(@Query() query: InsightQueryDto) {
    return this.insights.run(DIMENSION_LEVEL_UPS_INSIGHT, query);
  }

  @AdminInsight(QUEST_PROGRESS_INSIGHT)
  questProgress(@Query() query: InsightQueryDto) {
    return this.insights.run(QUEST_PROGRESS_INSIGHT, query);
  }

  @AdminInsight(MISSION_PROGRESS_INSIGHT)
  missionProgress(@Query() query: InsightQueryDto) {
    return this.insights.run(MISSION_PROGRESS_INSIGHT, query);
  }

  @AdminInsight(CHALLENGE_PROGRESS_INSIGHT)
  challengeProgress(@Query() query: InsightQueryDto) {
    return this.insights.run(CHALLENGE_PROGRESS_INSIGHT, query);
  }

  @AdminInsight(QUIZ_RESULTS_INSIGHT)
  quizResults(@Query() query: InsightQueryDto) {
    return this.insights.run(QUIZ_RESULTS_INSIGHT, query);
  }

  @AdminInsight(FOOD_FACTS_READ_INSIGHT)
  foodFactsRead(@Query() query: InsightQueryDto) {
    return this.insights.run(FOOD_FACTS_READ_INSIGHT, query);
  }

  @AdminInsight(BADGES_INSIGHT)
  badges(@Query() query: InsightQueryDto) {
    return this.insights.run(BADGES_INSIGHT, query);
  }

  @AdminInsight(BADGE_EARNS_INSIGHT)
  badgeEarns(@Query() query: InsightQueryDto) {
    return this.insights.run(BADGE_EARNS_INSIGHT, query);
  }

  @AdminInsight(XP_DISTRIBUTION_INSIGHT)
  xpDistribution(@Query() query: InsightQueryDto) {
    return this.insights.run(XP_DISTRIBUTION_INSIGHT, query);
  }

  @AdminInsight(XP_SOURCES_INSIGHT)
  xpSources(@Query() query: InsightQueryDto) {
    return this.insights.run(XP_SOURCES_INSIGHT, query);
  }
}
