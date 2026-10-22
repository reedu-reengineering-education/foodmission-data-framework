import { Prisma } from '@prisma/client';
import { breakdownColumns, UNKNOWN_BUCKET } from '../../shared/breakdowns';
import { InsightDefinition } from '../../shared/insight';

/** Current level per learning dimension. */
export const DIMENSION_LEVELS_INSIGHT: InsightDefinition = {
  id: 'dimension-levels',
  area: 'learning',
  title: 'Dimension levels',
  description:
    'Users per learning dimension and current level (user_dimension_levels). ' +
    'Levels start from the onboarding survey, can be set by the user and rise when every available quest at the level is completed. ' +
    'Users without a level row for a dimension count as "unknown".',
  values: ['users'],
  usersValue: 'users',
  timeSeries: false,
  sql: ({ breakdowns }) => Prisma.sql`
    SELECT
      d."code" AS "dimension",
      COALESCE(l."level"::text, ${UNKNOWN_BUCKET}) AS "level",
      ${breakdownColumns(breakdowns)},
      COUNT(*)::int AS "users"
    FROM users u
    CROSS JOIN dimensions d
    LEFT JOIN user_dimension_levels l
      ON l."userId" = u."id" AND l."dimensionId" = d."id"
    GROUP BY d."code", l."level", "bd1", "bd2"
    ORDER BY MIN(d."sortOrder"), l."level" NULLS LAST, "users" DESC`,
};
