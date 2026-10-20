import { Prisma } from '@prisma/client';
import { breakdownColumns } from '../../shared/breakdowns';
import { InsightDefinition } from '../../shared/insight';
import { weekOf, windowStart } from '../../shared/sql';

/** Users per earned badge. */
export const BADGES_INSIGHT: InsightDefinition = {
  id: 'badges',
  area: 'learning',
  title: 'Badges earned',
  description:
    'Distinct users per earned badge (user_earned_badges), rule-awarded and hand-granted alike. Badges nobody earned are omitted.',
  values: ['users'],
  usersValue: 'users',
  timeSeries: false,
  sql: ({ breakdowns }) => Prisma.sql`
    SELECT
      b."code" AS "badge",
      ${breakdownColumns(breakdowns)},
      COUNT(DISTINCT eb."userId")::int AS "users"
    FROM user_earned_badges eb
    JOIN badges b ON b."id" = eb."badgeId"
    JOIN users u ON u."id" = eb."userId"
    GROUP BY b."code", "bd1", "bd2"
    ORDER BY MIN(b."sortOrder"), b."code", "users" DESC`,
};

/** Badge earn curve. */
export const BADGE_EARNS_INSIGHT: InsightDefinition = {
  id: 'badge-earns',
  area: 'learning',
  title: 'Badges earned per week',
  description:
    'Users who earned a badge per ISO week (user_earned_badges.earnedAt). Empty weeks are omitted.',
  values: ['users'],
  usersValue: 'users',
  timeSeries: true,
  sql: ({ breakdowns, weeks }) => Prisma.sql`
    SELECT
      ${weekOf(Prisma.sql`eb."earnedAt"`)} AS "week",
      b."code" AS "badge",
      ${breakdownColumns(breakdowns)},
      COUNT(DISTINCT eb."userId")::int AS "users"
    FROM user_earned_badges eb
    JOIN badges b ON b."id" = eb."badgeId"
    JOIN users u ON u."id" = eb."userId"
    WHERE eb."earnedAt" >= ${windowStart(weeks)}
    GROUP BY 1, b."code", "bd1", "bd2"
    ORDER BY 1, MIN(b."sortOrder"), b."code"`,
};
