import { Prisma } from '@prisma/client';
import { EventType } from '../../events/event-types';
import { NOW_UTC } from './breakdowns';

/**
 * `weeks` CTE: ISO weeks (Monday start, UTC) of the last `weeks` weeks,
 * current partial week last. Column: "weekStart" (timestamp).
 */
export function weeksCte(weeks: number): Prisma.Sql {
  return Prisma.sql`
    weeks AS (
      SELECT generate_series(
        date_trunc('week', ${NOW_UTC}) - make_interval(weeks => ${weeks - 1}::int),
        date_trunc('week', ${NOW_UTC}),
        INTERVAL '1 week'
      ) AS "weekStart"
    )`;
}

/** Start of the oldest week in the `weeks` window. */
export function windowStart(weeks: number): Prisma.Sql {
  return Prisma.sql`(date_trunc('week', ${NOW_UTC}) - make_interval(weeks => ${weeks - 1}::int))`;
}

/** Week of a timestamp as YYYY-MM-DD (Monday, UTC). */
export function weekOf(column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`to_char(date_trunc('week', ${column}), 'YYYY-MM-DD')`;
}

/**
 * Events the server derives on its own (rewards, rule evaluations, cron
 * timeouts). They do not show that the user opened the app.
 */
const DERIVED_EVENT_TYPES = [
  EventType.WALLET_POINTS_AWARDED,
  EventType.WALLET_XP_AWARDED,
  EventType.WALLET_MANUAL_ADJUSTMENT,
  EventType.BADGE_EARNED,
  EventType.PROGRESS_INDICATOR_UPDATED,
  EventType.DIMENSION_LEVEL_UP,
];

/**
 * The single definition of "active": the user produced a client-originated
 * event — anything except seed data, derived rewards/level-ups and events
 * written by the rule engine (which include the hourly mission timeouts).
 * Admin dashboard requests write no events, so they do not count.
 *
 * `e` is the alias of `user_events`.
 */
export const CLIENT_EVENT_SQL = Prisma.sql`(
  e."source" <> 'seed'
  AND e."eventType" NOT IN (${Prisma.join(DERIVED_EVENT_TYPES)})
  AND COALESCE(e."metadata"->>'source', '') <> 'RULE_ENGINE'
)`;

/** Rounds a float expression to `digits` decimals and returns float8. */
export function round(expression: Prisma.Sql, digits = 3): Prisma.Sql {
  return Prisma.sql`ROUND((${expression})::numeric, ${digits}::int)::float8`;
}
