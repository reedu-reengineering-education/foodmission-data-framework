import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AGE_GROUP_SQL } from '../../common/analytics-utils';

export const USAGE_DIMENSIONS = [
  'country',
  'ageGroup',
  'gender',
  'language',
] as const;

export type UsageDimension = (typeof USAGE_DIMENSIONS)[number];

export interface UsageTotalsRow {
  totalUsers: number;
  active1d: number;
  active7d: number;
  active30d: number;
  new7d: number;
  new30d: number;
  neverSeen: number;
}

export interface UsageBreakdownRow {
  value: string;
  totalUsers: number;
  activeUsers: number;
}

export interface UsageTrendRow {
  weekStart: Date;
  activeUsers: number;
  newUsers: number;
  totalUsers: number;
}

/** Bucket value for users that never filled in the dimension. */
export const UNKNOWN_BUCKET = 'unknown';

// Prisma stores DateTime as UTC `timestamp` (no tz), so compare against UTC
// "now" regardless of the DB session time zone.
const NOW_UTC = Prisma.sql`(NOW() AT TIME ZONE 'UTC')`;

const DIMENSION_SQL: Record<UsageDimension, Prisma.Sql> = {
  // Free-text profile fields; normalise so "de", " DE" and "DE" collapse.
  country: Prisma.sql`UPPER(NULLIF(TRIM(u."country"), ''))`,
  language: Prisma.sql`LOWER(NULLIF(TRIM(u."language"), ''))`,
  gender: Prisma.sql`u."gender"::text`,
  ageGroup: AGE_GROUP_SQL,
};

/**
 * Live usage queries straight off `users` / `user_events`. Unlike the
 * meal-log and shopping-list analytics these are not batched or anonymised,
 * so they must only ever be exposed to admins.
 *
 * "Active" means `users.lastLoginAt` falls inside the window. The
 * DataBaseAuthGuard refreshes that column on every authenticated request
 * (throttled to 5 min), so it reflects last app use, not just token logins.
 */
@Injectable()
export class UsageAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getTotals(): Promise<UsageTotalsRow> {
    const [row] = await this.prisma.$queryRaw<UsageTotalsRow[]>`
      SELECT
        COUNT(*)::int AS "totalUsers",
        COUNT(*) FILTER (WHERE u."lastLoginAt" >= ${NOW_UTC} - INTERVAL '1 day')::int AS "active1d",
        COUNT(*) FILTER (WHERE u."lastLoginAt" >= ${NOW_UTC} - INTERVAL '7 days')::int AS "active7d",
        COUNT(*) FILTER (WHERE u."lastLoginAt" >= ${NOW_UTC} - INTERVAL '30 days')::int AS "active30d",
        COUNT(*) FILTER (WHERE u."createdAt" >= ${NOW_UTC} - INTERVAL '7 days')::int AS "new7d",
        COUNT(*) FILTER (WHERE u."createdAt" >= ${NOW_UTC} - INTERVAL '30 days')::int AS "new30d",
        COUNT(*) FILTER (WHERE u."lastLoginAt" IS NULL)::int AS "neverSeen"
      FROM users u`;
    return row;
  }

  getBreakdown(
    dimension: UsageDimension,
    activeDays: number,
  ): Promise<UsageBreakdownRow[]> {
    return this.prisma.$queryRaw<UsageBreakdownRow[]>`
      SELECT
        COALESCE(${DIMENSION_SQL[dimension]}, ${UNKNOWN_BUCKET}) AS "value",
        COUNT(*)::int AS "totalUsers",
        COUNT(*) FILTER (
          WHERE u."lastLoginAt" >= ${NOW_UTC} - make_interval(days => ${activeDays}::int)
        )::int AS "activeUsers"
      FROM users u
      GROUP BY 1
      ORDER BY "activeUsers" DESC, "totalUsers" DESC, "value" ASC`;
  }

  /**
   * Weekly (ISO, Monday-start, UTC) series for the last `weeks` weeks,
   * including the current partial week. Weekly actives come from the event
   * ledger (any event, e.g. APP_SESSION_OPENED / USER_LOGGED_IN), because
   * `lastLoginAt` only keeps the latest timestamp.
   */
  getWeeklyTrend(weeks: number): Promise<UsageTrendRow[]> {
    return this.prisma.$queryRaw<UsageTrendRow[]>`
      WITH weeks AS (
        SELECT generate_series(
          date_trunc('week', ${NOW_UTC}) - make_interval(weeks => ${weeks - 1}::int),
          date_trunc('week', ${NOW_UTC}),
          INTERVAL '1 week'
        ) AS "weekStart"
      )
      SELECT
        w."weekStart",
        (
          SELECT COUNT(DISTINCT e."userId")
          FROM user_events e
          WHERE e."createdAt" >= w."weekStart"
            AND e."createdAt" < w."weekStart" + INTERVAL '1 week'
        )::int AS "activeUsers",
        (
          SELECT COUNT(*)
          FROM users u
          WHERE u."createdAt" >= w."weekStart"
            AND u."createdAt" < w."weekStart" + INTERVAL '1 week'
        )::int AS "newUsers",
        (
          SELECT COUNT(*)
          FROM users u
          WHERE u."createdAt" < w."weekStart" + INTERVAL '1 week'
        )::int AS "totalUsers"
      FROM weeks w
      ORDER BY w."weekStart" ASC`;
  }
}
