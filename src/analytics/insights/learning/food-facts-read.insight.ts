import { Prisma } from '@prisma/client';
import { breakdownColumns } from '../../shared/breakdowns';
import { InsightDefinition } from '../../shared/insight';
import { contentRollup, TOPIC_ROLLUPS } from './content-rollup';

const COLUMNS = {
  dimension: Prisma.sql`d."code"`,
  dimensionOrder: Prisma.sql`d."sortOrder"`,
  level: Prisma.sql`f."level"`,
  topic: Prisma.sql`t."code"`,
  item: Prisma.sql`f."code"`,
  itemKey: 'foodFact',
};

/** Food fact readers. */
export const FOOD_FACTS_READ_INSIGHT: InsightDefinition = {
  id: 'food-facts-read',
  area: 'learning',
  title: 'Food facts read',
  description:
    'Read food facts (food_fact_progress). users = distinct readers, reads = user–fact pairs (re-reads are not counted). ' +
    'Dimension comes from the fact topic.',
  values: ['users', 'reads'],
  usersValue: 'users',
  timeSeries: false,
  by: TOPIC_ROLLUPS,
  sql: ({ breakdowns, by }) => {
    const rollup = contentRollup(by, COLUMNS);
    return Prisma.sql`
      SELECT
        ${rollup.select}
        ${breakdownColumns(breakdowns)},
        COUNT(DISTINCT p."userId")::int AS "users",
        COUNT(*)::int AS "reads"
      FROM food_fact_progress p
      JOIN food_facts f ON f."id" = p."foodFactId"
      JOIN topics t ON t."id" = f."topicId"
      JOIN dimensions d ON d."id" = t."dimensionId"
      JOIN users u ON u."id" = p."userId"
      GROUP BY ${rollup.groupBy} "bd1", "bd2"
      ORDER BY ${rollup.orderBy}, "users" DESC`;
  },
};
