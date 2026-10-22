import { Prisma } from '@prisma/client';
import { EventType } from '../../../events/event-types';
import { breakdownColumns, UNKNOWN_BUCKET } from '../../shared/breakdowns';
import { InsightDefinition } from '../../shared/insight';
import { CLIENT_EVENT_SQL, round, weekOf, windowStart } from '../../shared/sql';

const SESSION_KEYS: Record<string, Prisma.Sql> = {
  platform: Prisma.sql`COALESCE(LOWER(NULLIF(TRIM(e."metadata"->>'platform'), '')), ${UNKNOWN_BUCKET})`,
  appVersion: Prisma.sql`COALESCE(NULLIF(TRIM(e."metadata"->>'appVersion'), ''), ${UNKNOWN_BUCKET})`,
};

/** App sessions per week, optionally split by platform or app version. */
export const SESSIONS_INSIGHT: InsightDefinition = {
  id: 'sessions',
  area: 'usage',
  title: 'App sessions',
  description:
    'APP_SESSION_OPENED events per ISO week: sessions, distinct users with a session and sessions per user. ' +
    'by=platform / appVersion splits by the event metadata. Weeks without sessions are omitted.',
  values: ['sessions', 'users', 'sessionsPerUser'],
  usersValue: 'users',
  timeSeries: true,
  by: ['total', 'platform', 'appVersion'],
  userGroupColumns: ['platform', 'appVersion'],
  sql: ({ breakdowns, weeks, by }) => {
    const key = SESSION_KEYS[by];
    return Prisma.sql`
      SELECT
        ${weekOf(Prisma.sql`e."createdAt"`)} AS "week",
        ${key ? Prisma.sql`${key} AS ${Prisma.raw(`"${by}"`)},` : Prisma.empty}
        ${breakdownColumns(breakdowns)},
        COUNT(*)::int AS "sessions",
        COUNT(DISTINCT e."userId")::int AS "users",
        ${round(Prisma.sql`COUNT(*)::float8 / COUNT(DISTINCT e."userId")`, 2)} AS "sessionsPerUser"
      FROM user_events e
      JOIN users u ON u."id" = e."userId"
      WHERE e."eventType" = ${EventType.APP_SESSION_OPENED}
        AND e."createdAt" >= ${windowStart(weeks)}
        AND ${CLIENT_EVENT_SQL}
      GROUP BY 1, ${key ? Prisma.sql`2,` : Prisma.empty} "bd1", "bd2"
      ORDER BY 1, "sessions" DESC`;
  },
};
