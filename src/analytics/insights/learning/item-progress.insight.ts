import { Prisma } from '@prisma/client';
import { EventType } from '../../../events/event-types';
import { breakdownColumns } from '../../shared/breakdowns';
import { InsightDefinition } from '../../shared/insight';
import { round } from '../../shared/sql';
import { contentRollup, ITEM_ROLLUPS } from './content-rollup';

interface ItemKind {
  insightId: string;
  title: string;
  itemKey: 'mission' | 'challenge';
  catalogTable: string;
  progressTable: string;
  /** Column in the progress table and key in event metadata. */
  idColumn: string;
  started: string;
  completed: string;
  failed: string;
  note: string;
}

const VALUES = [
  'users',
  'activeUsers',
  'completedUsers',
  'completions',
  'completionsByRule',
  'completionsSelfReported',
  'failures',
  'failuresByUser',
  'failuresWithoutActivity',
  'avgProgress',
] as const;

function itemProgressInsight(kind: ItemKind): InsightDefinition {
  const t = (name: string) => Prisma.raw(`"${name}"`);
  const columns = {
    dimension: Prisma.sql`d."code"`,
    dimensionOrder: Prisma.sql`d."sortOrder"`,
    level: Prisma.sql`c."level"`,
    item: Prisma.sql`c."code"`,
    itemKey: kind.itemKey,
  };
  return {
    id: kind.insightId,
    area: 'learning',
    title: kind.title,
    description:
      `${kind.progressTable} rows plus ${kind.started} / ${kind.completed} / ${kind.failed} events. ` +
      'users = assigned (a row exists; picking a quest seeds rows as NOT_STARTED, which is not a start), ' +
      `activeUsers = progress > 0, completed or a ${kind.started} event, completedUsers = completed flag. ` +
      'completions / failures count user–item pairs: completionsByRule have a completion event from the rule engine, ' +
      'the rest were self-reported through the API (or have no event). failures = status FAILED and not completed; ' +
      'failuresByUser were given up through the API, failuresWithoutActivity were never active (mostly the 7-day timeout). ' +
      `avgProgress = mean progress (0–100). ${kind.note} ` +
      'Rows deleted on a quest switch are lost. Rollups count distinct users.',
    values: VALUES,
    usersValue: 'users',
    timeSeries: false,
    by: ITEM_ROLLUPS,
    sql: ({ breakdowns, by }) => {
      const rollup = contentRollup(by, columns);
      return Prisma.sql`
        WITH ev AS (
          SELECT
            e."userId",
            e."metadata"->>${kind.idColumn} AS "itemId",
            bool_or(e."eventType" = ${kind.started}) AS "started",
            bool_or(e."eventType" = ${kind.completed} AND e."metadata"->>'source' = 'RULE_ENGINE') AS "completedByRule",
            bool_or(e."eventType" = ${kind.failed} AND e."metadata"->>'source' = 'api') AS "failedByUser"
          FROM user_events e
          WHERE e."eventType" IN (${kind.started}, ${kind.completed}, ${kind.failed})
          GROUP BY 1, 2
        ),
        pairs AS (
          SELECT
            p."userId",
            p.${t(kind.idColumn)} AS "itemId",
            p."progress",
            p."completed",
            p."status" = 'FAILED' AND NOT p."completed" AS "failed",
            (p."progress" > 0 OR p."completed" OR COALESCE(ev."started", false)) AS "active",
            COALESCE(ev."completedByRule", false) AS "completedByRule",
            COALESCE(ev."failedByUser", false) AS "failedByUser"
          FROM ${t(kind.progressTable)} p
          LEFT JOIN ev ON ev."userId" = p."userId" AND ev."itemId" = p.${t(kind.idColumn)}
        )
        SELECT
          ${rollup.select}
          ${breakdownColumns(breakdowns)},
          COUNT(DISTINCT p."userId")::int AS "users",
          COUNT(DISTINCT p."userId") FILTER (WHERE p."active")::int AS "activeUsers",
          COUNT(DISTINCT p."userId") FILTER (WHERE p."completed")::int AS "completedUsers",
          COUNT(*) FILTER (WHERE p."completed")::int AS "completions",
          COUNT(*) FILTER (WHERE p."completed" AND p."completedByRule")::int AS "completionsByRule",
          COUNT(*) FILTER (WHERE p."completed" AND NOT p."completedByRule")::int AS "completionsSelfReported",
          COUNT(*) FILTER (WHERE p."failed")::int AS "failures",
          COUNT(*) FILTER (WHERE p."failed" AND p."failedByUser")::int AS "failuresByUser",
          COUNT(*) FILTER (WHERE p."failed" AND NOT p."active")::int AS "failuresWithoutActivity",
          ${round(Prisma.sql`AVG(p."progress")`, 1)} AS "avgProgress"
        FROM pairs p
        JOIN ${t(kind.catalogTable)} c ON c."id" = p."itemId"
        JOIN dimensions d ON d."id" = c."dimensionId"
        JOIN users u ON u."id" = p."userId"
        GROUP BY ${rollup.groupBy} "bd1", "bd2"
        ORDER BY ${rollup.orderBy}, "users" DESC`;
    },
  };
}

export const MISSION_PROGRESS_INSIGHT = itemProgressInsight({
  insightId: 'mission-progress',
  title: 'Mission progress',
  itemKey: 'mission',
  catalogTable: 'missions',
  progressTable: 'mission_progress',
  idColumn: 'missionId',
  started: EventType.MISSION_STARTED,
  completed: EventType.MISSION_COMPLETED,
  failed: EventType.MISSION_FAILED,
  note: 'Missions with a rule are completed by the rule engine; they can also be self-reported through PATCH.',
});

export const CHALLENGE_PROGRESS_INSIGHT = itemProgressInsight({
  insightId: 'challenge-progress',
  title: 'Challenge progress',
  itemKey: 'challenge',
  catalogTable: 'challenges',
  progressTable: 'challenge_progress',
  idColumn: 'challengeId',
  started: EventType.CHALLENGE_STARTED,
  completed: EventType.CHALLENGE_COMPLETED,
  failed: EventType.CHALLENGE_FAILED,
  note: 'No challenge has a rule today, so completions are self-reported.',
});
