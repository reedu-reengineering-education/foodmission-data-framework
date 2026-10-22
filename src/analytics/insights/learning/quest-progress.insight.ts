import { Prisma } from '@prisma/client';
import { breakdownColumns } from '../../shared/breakdowns';
import { InsightDefinition } from '../../shared/insight';
import { round } from '../../shared/sql';
import { contentRollup, ITEM_ROLLUPS } from './content-rollup';

const COLUMNS = {
  dimension: Prisma.sql`d."code"`,
  dimensionOrder: Prisma.sql`d."sortOrder"`,
  level: Prisma.sql`q."level"`,
  item: Prisma.sql`q."code"`,
  itemKey: 'quest',
};

/** Personal quest funnel. */
export const QUEST_PROGRESS_INSIGHT: InsightDefinition = {
  id: 'quest-progress',
  area: 'learning',
  title: 'Quest progress',
  description:
    'Personal quests. A user counts for a quest when it is their current quest or they have a quest_progress row. ' +
    'users = such users, currentUsers = quest is users.currentQuestId, startedUsers = progress > 0 or completed, ' +
    'completedUsers = completed (the completed flag is the truth; status is unreliable on older rows), ' +
    'avgProgress = mean progress (0–100) over user–quest pairs. ' +
    'quest_progress rows appear at the first recompute after a completion, not at selection. Group quests are not included. ' +
    'Rollups count distinct users, so a user with two quests in a dimension counts once.',
  values: [
    'users',
    'currentUsers',
    'startedUsers',
    'completedUsers',
    'avgProgress',
  ],
  usersValue: 'users',
  timeSeries: false,
  by: ITEM_ROLLUPS,
  sql: ({ breakdowns, by }) => {
    const rollup = contentRollup(by, COLUMNS);
    return Prisma.sql`
      WITH current_quests AS (
        SELECT "id" AS "userId", "currentQuestId" AS "questId"
        FROM users
        WHERE "currentQuestId" IS NOT NULL
      ),
      pairs AS (
        SELECT
          COALESCE(qp."userId", cq."userId") AS "userId",
          COALESCE(qp."questId", cq."questId") AS "questId",
          cq."userId" IS NOT NULL AS "isCurrent",
          COALESCE(qp."progress", 0) AS "progress",
          COALESCE(qp."completed", false) AS "completed"
        FROM quest_progress qp
        FULL JOIN current_quests cq
          ON cq."userId" = qp."userId" AND cq."questId" = qp."questId"
      )
      SELECT
        ${rollup.select}
        ${breakdownColumns(breakdowns)},
        COUNT(DISTINCT p."userId")::int AS "users",
        COUNT(DISTINCT p."userId") FILTER (WHERE p."isCurrent")::int AS "currentUsers",
        COUNT(DISTINCT p."userId") FILTER (WHERE p."progress" > 0 OR p."completed")::int AS "startedUsers",
        COUNT(DISTINCT p."userId") FILTER (WHERE p."completed")::int AS "completedUsers",
        ${round(Prisma.sql`AVG(p."progress")`, 1)} AS "avgProgress"
      FROM pairs p
      JOIN quests q ON q."id" = p."questId"
      JOIN dimensions d ON d."id" = q."dimensionId"
      JOIN users u ON u."id" = p."userId"
      GROUP BY ${rollup.groupBy} "bd1", "bd2"
      ORDER BY ${rollup.orderBy}, "users" DESC`;
  },
};
