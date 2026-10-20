import { Prisma } from '@prisma/client';
import { breakdownColumns } from '../../shared/breakdowns';
import { InsightDefinition } from '../../shared/insight';
import { CLIENT_EVENT_SQL, weeksCte, windowStart } from '../../shared/sql';

/** Weekly active, new and cumulative registered users. */
export const WEEKLY_ACTIVITY_INSIGHT: InsightDefinition = {
  id: 'weekly-activity',
  area: 'usage',
  title: 'Weekly activity',
  description:
    'Per ISO week (Monday, UTC; current partial week last): activeUsers = distinct users with a client-originated event that week, ' +
    'newUsers = users registered that week, totalUsers = users registered before the week ended. ' +
    'Weeks before a group had any registered user are omitted.',
  values: ['activeUsers', 'newUsers', 'totalUsers'],
  usersValue: 'totalUsers',
  timeSeries: true,
  sql: ({ breakdowns, weeks }) => Prisma.sql`
    WITH ${weeksCte(weeks)},
    active AS (
      SELECT DISTINCT date_trunc('week', e."createdAt") AS "weekStart", e."userId"
      FROM user_events e
      WHERE e."createdAt" >= ${windowStart(weeks)}
        AND ${CLIENT_EVENT_SQL}
    )
    SELECT
      to_char(w."weekStart", 'YYYY-MM-DD') AS "week",
      ${breakdownColumns(breakdowns)},
      COUNT(a."userId")::int AS "activeUsers",
      COUNT(*) FILTER (WHERE u."createdAt" >= w."weekStart")::int AS "newUsers",
      COUNT(*)::int AS "totalUsers"
    FROM weeks w
    JOIN users u ON u."createdAt" < w."weekStart" + INTERVAL '1 week'
    LEFT JOIN active a ON a."weekStart" = w."weekStart" AND a."userId" = u."id"
    GROUP BY w."weekStart", "bd1", "bd2"
    ORDER BY w."weekStart", "totalUsers" DESC, "bd1", "bd2"`,
};
