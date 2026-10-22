import { Prisma } from '@prisma/client';
import { breakdownColumns } from '../../shared/breakdowns';
import { InsightDefinition } from '../../shared/insight';
import { CLIENT_EVENT_SQL, weekOf, windowStart } from '../../shared/sql';

/**
 * Feature families by event type prefix (see src/events/event-types.ts).
 * Account, session and wallet events belong to no family.
 */
export const FEATURE_FAMILIES: Record<string, readonly string[]> = {
  meal_logging: ['MEAL_', 'SWAP_', 'NUTRITION_'],
  shopping: ['SHOPPING_'],
  product_checks: ['PROCESSING_', 'PACKAGING_'],
  food_waste: ['FOOD_WASTE_'],
  learning: ['LEARNING_', 'QUIZ_'],
  gamification: ['MISSION_', 'CHALLENGE_', 'QUEST_', 'FOODY_'],
  groups: ['USER_GROUP_'],
  surveys: ['SURVEY_'],
};

const FAMILY_SQL = Prisma.sql`CASE
  ${Prisma.join(
    Object.entries(FEATURE_FAMILIES).map(
      ([family, prefixes]) =>
        Prisma.sql`WHEN ${Prisma.join(
          prefixes.map(
            (prefix) => Prisma.sql`starts_with(e."eventType", ${prefix})`,
          ),
          ' OR ',
        )} THEN ${family}`,
    ),
    ' ',
  )}
END`;

/** Users per week per feature family. */
export const FEATURE_USAGE_INSIGHT: InsightDefinition = {
  id: 'feature-usage',
  area: 'usage',
  title: 'Feature usage',
  description:
    'Per ISO week and feature family (event type prefix: meal_logging, shopping, product_checks, food_waste, learning, gamification, groups, surveys): ' +
    'distinct users and number of client-originated events. Weeks or families without events are omitted.',
  values: ['users', 'events'],
  usersValue: 'users',
  timeSeries: true,
  sql: ({ breakdowns, weeks }) => Prisma.sql`
    WITH tagged AS (
      SELECT e."userId", e."createdAt", ${FAMILY_SQL} AS "family"
      FROM user_events e
      WHERE e."createdAt" >= ${windowStart(weeks)}
        AND ${CLIENT_EVENT_SQL}
    )
    SELECT
      ${weekOf(Prisma.sql`t."createdAt"`)} AS "week",
      t."family",
      ${breakdownColumns(breakdowns)},
      COUNT(DISTINCT t."userId")::int AS "users",
      COUNT(*)::int AS "events"
    FROM tagged t
    JOIN users u ON u."id" = t."userId"
    WHERE t."family" IS NOT NULL
    GROUP BY 1, 2, "bd1", "bd2"
    ORDER BY 1, "users" DESC`,
};
