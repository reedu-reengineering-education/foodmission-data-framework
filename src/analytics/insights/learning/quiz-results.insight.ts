import { Prisma } from '@prisma/client';
import { breakdownColumns } from '../../shared/breakdowns';
import { InsightDefinition } from '../../shared/insight';
import { round } from '../../shared/sql';
import { contentRollup, TOPIC_ROLLUPS } from './content-rollup';

const COLUMNS = {
  dimension: Prisma.sql`d."code"`,
  dimensionOrder: Prisma.sql`d."sortOrder"`,
  level: Prisma.sql`qz."level"`,
  topic: Prisma.sql`t."code"`,
  item: Prisma.sql`qz."code"`,
  itemKey: 'quiz',
};

/** Quiz answers and final-answer correctness. */
export const QUIZ_RESULTS_INSIGHT: InsightDefinition = {
  id: 'quiz-results',
  area: 'learning',
  title: 'Quiz results',
  description:
    'Answered quizzes (quiz_progress with an answer). users = distinct users who answered, answers = user–quiz pairs, ' +
    'correctAnswers = pairs whose latest answer is correct, correctRate = correctAnswers / answers. ' +
    'Only the first and the latest answer are stored, so attempts are not counted. ' +
    'Dimension comes from the quiz topic.',
  values: ['users', 'answers', 'correctAnswers', 'correctRate'],
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
        COUNT(*)::int AS "answers",
        COUNT(*) FILTER (WHERE p."isCorrect")::int AS "correctAnswers",
        ${round(Prisma.sql`COUNT(*) FILTER (WHERE p."isCorrect")::float8 / COUNT(*)`)} AS "correctRate"
      FROM quiz_progress p
      JOIN quizzes qz ON qz."id" = p."quizId"
      JOIN topics t ON t."id" = qz."topicId"
      JOIN dimensions d ON d."id" = t."dimensionId"
      JOIN users u ON u."id" = p."userId"
      WHERE p."completed" OR p."answeredAt" IS NOT NULL OR p."selectedOptionId" IS NOT NULL
      GROUP BY ${rollup.groupBy} "bd1", "bd2"
      ORDER BY ${rollup.orderBy}, "users" DESC`;
  },
};
