import { Prisma } from '@prisma/client';
import { breakdownColumns } from '../../shared/breakdowns';
import { InsightDefinition } from '../../shared/insight';

/** Bucket for users without a current quest. */
export const NO_QUEST = 'none';

/** What users are working on right now: dimension and level of their current quest. */
export const DIMENSION_FOCUS_INSIGHT: InsightDefinition = {
  id: 'dimension-focus',
  area: 'learning',
  title: 'Dimension focus',
  description:
    'Users per dimension and level of their current personal quest (users.currentQuestId). ' +
    'Users without a current quest count as dimension and level "none". Group quests are not included. ' +
    'A snapshot: quest switches are not recorded yet, so past focus cannot be reconstructed.',
  values: ['users'],
  usersValue: 'users',
  timeSeries: false,
  sql: ({ breakdowns }) => Prisma.sql`
    SELECT
      COALESCE(d."code", ${NO_QUEST}) AS "dimension",
      COALESCE(q."level"::text, ${NO_QUEST}) AS "level",
      ${breakdownColumns(breakdowns)},
      COUNT(*)::int AS "users"
    FROM users u
    LEFT JOIN quests q ON q."id" = u."currentQuestId"
    LEFT JOIN dimensions d ON d."id" = q."dimensionId"
    GROUP BY d."code", q."level", "bd1", "bd2"
    ORDER BY MIN(d."sortOrder") NULLS LAST, q."level" NULLS LAST, "users" DESC`,
};
