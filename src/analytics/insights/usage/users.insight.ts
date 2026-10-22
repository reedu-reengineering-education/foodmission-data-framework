import { Prisma } from '@prisma/client';
import { breakdownColumns, NOW_UTC } from '../../shared/breakdowns';
import { InsightDefinition } from '../../shared/insight';
import { CLIENT_EVENT_SQL, round } from '../../shared/sql';

const activeWithin = (days: number) =>
  Prisma.sql`COUNT(*) FILTER (WHERE a."lastActiveAt" >= ${NOW_UTC} - make_interval(days => ${days}::int))`;

const newWithin = (days: number) =>
  Prisma.sql`COUNT(*) FILTER (WHERE u."createdAt" >= ${NOW_UTC} - make_interval(days => ${days}::int))`;

/**
 * Registered, active and new users, plus stickiness. Without a breakdown
 * this is a single totals row.
 */
export const USERS_INSIGHT: InsightDefinition = {
  id: 'users',
  area: 'usage',
  title: 'Users',
  description:
    'Registered users (`users`), users active in the last 1/7/30 days and users registered in the last 7/30 days. ' +
    'Active = at least one client-originated event (seed data, rewards, level-ups and rule-engine events do not count). ' +
    'dauOverMau / wauOverMau = active1d / active30d and active7d / active30d, null without monthly actives.',
  values: [
    'users',
    'active1d',
    'active7d',
    'active30d',
    'new7d',
    'new30d',
    'dauOverMau',
    'wauOverMau',
  ],
  usersValue: 'users',
  timeSeries: false,
  sql: ({ breakdowns }) => Prisma.sql`
    WITH active AS (
      SELECT e."userId", MAX(e."createdAt") AS "lastActiveAt"
      FROM user_events e
      WHERE e."createdAt" >= ${NOW_UTC} - INTERVAL '30 days'
        AND ${CLIENT_EVENT_SQL}
      GROUP BY e."userId"
    )
    SELECT
      ${breakdownColumns(breakdowns)},
      COUNT(*)::int AS "users",
      ${activeWithin(1)}::int AS "active1d",
      ${activeWithin(7)}::int AS "active7d",
      ${activeWithin(30)}::int AS "active30d",
      ${newWithin(7)}::int AS "new7d",
      ${newWithin(30)}::int AS "new30d",
      ${round(Prisma.sql`${activeWithin(1)}::float8 / NULLIF(${activeWithin(30)}, 0)`)} AS "dauOverMau",
      ${round(Prisma.sql`${activeWithin(7)}::float8 / NULLIF(${activeWithin(30)}, 0)`)} AS "wauOverMau"
    FROM users u
    LEFT JOIN active a ON a."userId" = u."id"
    GROUP BY "bd1", "bd2"
    ORDER BY "users" DESC, "bd1", "bd2"`,
};
