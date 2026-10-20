import { InsightDefinition } from '../shared/insight';
import { BADGE_EARNS_INSIGHT, BADGES_INSIGHT } from './learning/badges.insight';
import { DIMENSION_FOCUS_INSIGHT } from './learning/dimension-focus.insight';
import { DIMENSION_LEVEL_UPS_INSIGHT } from './learning/dimension-level-ups.insight';
import { DIMENSION_LEVELS_INSIGHT } from './learning/dimension-levels.insight';
import { FOOD_FACTS_READ_INSIGHT } from './learning/food-facts-read.insight';
import {
  CHALLENGE_PROGRESS_INSIGHT,
  MISSION_PROGRESS_INSIGHT,
} from './learning/item-progress.insight';
import { QUEST_PROGRESS_INSIGHT } from './learning/quest-progress.insight';
import { QUIZ_RESULTS_INSIGHT } from './learning/quiz-results.insight';
import {
  XP_DISTRIBUTION_INSIGHT,
  XP_SOURCES_INSIGHT,
} from './learning/xp.insight';
import { FEATURE_USAGE_INSIGHT } from './usage/feature-usage.insight';
import { SESSIONS_INSIGHT } from './usage/sessions.insight';
import { USERS_INSIGHT } from './usage/users.insight';
import { WEEKLY_ACTIVITY_INSIGHT } from './usage/weekly-activity.insight';

/** Every admin insight, in catalog order. Served at `/analytics/admin/<area>/<id>`. */
export const INSIGHTS: readonly InsightDefinition[] = [
  USERS_INSIGHT,
  WEEKLY_ACTIVITY_INSIGHT,
  SESSIONS_INSIGHT,
  FEATURE_USAGE_INSIGHT,
  DIMENSION_LEVELS_INSIGHT,
  DIMENSION_FOCUS_INSIGHT,
  DIMENSION_LEVEL_UPS_INSIGHT,
  QUEST_PROGRESS_INSIGHT,
  MISSION_PROGRESS_INSIGHT,
  CHALLENGE_PROGRESS_INSIGHT,
  QUIZ_RESULTS_INSIGHT,
  FOOD_FACTS_READ_INSIGHT,
  BADGES_INSIGHT,
  BADGE_EARNS_INSIGHT,
  XP_DISTRIBUTION_INSIGHT,
  XP_SOURCES_INSIGHT,
];

export function insightPath(definition: InsightDefinition): string {
  return `/analytics/admin/${definition.area}/${definition.id}`;
}
