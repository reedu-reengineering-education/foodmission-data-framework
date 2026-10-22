import { Prisma } from '@prisma/client';
import { EventType } from '../../../events/event-types';
import { breakdownColumns } from '../../shared/breakdowns';
import { InsightDefinition } from '../../shared/insight';
import { weekOf, windowStart } from '../../shared/sql';

/** Earned level-ups per week. */
export const DIMENSION_LEVEL_UPS_INSIGHT: InsightDefinition = {
  id: 'dimension-level-ups',
  area: 'learning',
  title: 'Dimension level-ups',
  description:
    'DIMENSION_LEVEL_UP events per ISO week, dimension and level reached (metadata.dimensionCode / metadata.to): ' +
    'level-ups and distinct users. Only earned level-ups; survey and user-set levels emit no event. Empty weeks are omitted.',
  values: ['levelUps', 'users'],
  usersValue: 'users',
  timeSeries: true,
  sql: ({ breakdowns, weeks }) => Prisma.sql`
    SELECT
      ${weekOf(Prisma.sql`e."createdAt"`)} AS "week",
      e."metadata"->>'dimensionCode' AS "dimension",
      e."metadata"->>'to' AS "level",
      ${breakdownColumns(breakdowns)},
      COUNT(*)::int AS "levelUps",
      COUNT(DISTINCT e."userId")::int AS "users"
    FROM user_events e
    JOIN users u ON u."id" = e."userId"
    WHERE e."eventType" = ${EventType.DIMENSION_LEVEL_UP}
      AND e."createdAt" >= ${windowStart(weeks)}
    GROUP BY 1, 2, 3, "bd1", "bd2"
    ORDER BY 1, 2, 3, "levelUps" DESC`,
};
