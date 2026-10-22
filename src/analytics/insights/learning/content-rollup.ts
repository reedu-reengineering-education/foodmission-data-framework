import { Prisma } from '@prisma/client';

/** Raw (parameter-free) column expressions of a content item. */
export interface ContentColumns {
  /** Dimension code, e.g. `d."code"`. */
  dimension: Prisma.Sql;
  /** Dimension display order, e.g. `d."sortOrder"`. */
  dimensionOrder: Prisma.Sql;
  /** ContentLevel enum column. */
  level: Prisma.Sql;
  /** Topic code; only for content that belongs to a topic. */
  topic?: Prisma.Sql;
  /** Item code and the group key it is returned under ("mission", "quiz", …). */
  item: Prisma.Sql;
  itemKey: string;
}

export interface ContentRollup {
  /** `<expr> AS "<key>", …` — ends with a comma. */
  select: Prisma.Sql;
  /** `<expr>, …` — ends with a comma, followed by `"bd1", "bd2"`. */
  groupBy: Prisma.Sql;
  orderBy: Prisma.Sql;
}

/** `by` options for content without topics (quests, missions, challenges). */
export const ITEM_ROLLUPS = ['item', 'level', 'dimension'] as const;
/** `by` options for topic-based content (quizzes, food facts). */
export const TOPIC_ROLLUPS = ['item', 'topic', 'level', 'dimension'] as const;

/**
 * Group columns for a rollup level:
 * - `dimension`: dimension
 * - `level`: dimension + level
 * - `topic`: dimension + topic
 * - `item`: dimension (+ topic) + level + item code
 *
 * Expressions carry no query parameters, so they can be repeated verbatim
 * in GROUP BY.
 */
export function contentRollup(by: string, c: ContentColumns): ContentRollup {
  const parts: [string, Prisma.Sql][] = [['dimension', c.dimension]];
  if (by === 'topic' && c.topic) parts.push(['topic', c.topic]);
  if (by === 'level') parts.push(['level', c.level]);
  if (by === 'item') {
    if (c.topic) parts.push(['topic', c.topic]);
    parts.push(['level', c.level], [c.itemKey, c.item]);
  }
  const rest = parts.slice(1).map(([, expression]) => expression);
  return {
    select: Prisma.sql`${Prisma.join(
      parts.map(
        ([key, expression]) =>
          Prisma.sql`${expression}::text AS ${Prisma.raw(`"${key}"`)}`,
      ),
    )},`,
    groupBy: Prisma.sql`${Prisma.join(parts.map(([, expression]) => expression))},`,
    orderBy: Prisma.join([Prisma.sql`MIN(${c.dimensionOrder})`, ...rest]),
  };
}
