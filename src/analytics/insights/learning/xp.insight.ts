import { Prisma } from '@prisma/client';
import { breakdownColumns } from '../../shared/breakdowns';
import { InsightDefinition } from '../../shared/insight';

/** Lower bounds of the XP balance buckets, ascending. */
export const XP_BUCKETS = [0, 1, 100, 250, 500, 1000, 2500] as const;

function bucketLabel(i: number): string {
  const low = XP_BUCKETS[i];
  const next = XP_BUCKETS[i + 1];
  if (next === undefined) return `${low}+`;
  return next - 1 === low ? `${low}` : `${low}-${next - 1}`;
}

export const XP_BUCKET_LABELS = XP_BUCKETS.map((_, i) => bucketLabel(i));

const XP = Prisma.sql`COALESCE(w."xp", 0)`;
const BUCKET_SQL = Prisma.sql`CASE ${Prisma.join(
  XP_BUCKETS.map((_, i) => i)
    .reverse()
    .map(
      (i) =>
        Prisma.sql`WHEN ${XP} >= ${XP_BUCKETS[i]} THEN ${XP_BUCKET_LABELS[i]}`,
    ),
  ' ',
)} END`;

/** Users per XP balance bucket. */
export const XP_DISTRIBUTION_INSIGHT: InsightDefinition = {
  id: 'xp-distribution',
  area: 'learning',
  title: 'XP distribution',
  description: `Users per current XP balance bucket (${XP_BUCKET_LABELS.join(', ')}). Users without a wallet have 0 XP.`,
  values: ['users'],
  usersValue: 'users',
  timeSeries: false,
  sql: ({ breakdowns }) => Prisma.sql`
    SELECT
      ${BUCKET_SQL} AS "bucket",
      ${breakdownColumns(breakdowns)},
      COUNT(*)::int AS "users"
    FROM users u
    LEFT JOIN user_gamification_wallets w ON w."userId" = u."id"
    GROUP BY 1, "bd1", "bd2"
    ORDER BY MIN(${XP}), "users" DESC`,
};

const SOURCE_KEYS: Record<string, Prisma.Sql> = {
  sourceType: Prisma.sql`COALESCE(we."sourceType"::text, 'OTHER')`,
  dimension: Prisma.sql`COALESCE(d."code", 'none')`,
};

/** Where XP comes from. */
export const XP_SOURCES_INSIGHT: InsightDefinition = {
  id: 'xp-sources',
  area: 'learning',
  title: 'XP sources',
  description:
    'XP credited (wallet_entries, currency XP, amount > 0) all time, by source type (MISSION, CHALLENGE, QUEST, QUIZ, FOOD_FACT, SURVEY, BADGE; OTHER without source) ' +
    'or by learning dimension of the source item (quizzes and food facts via their topic; "none" for surveys, badges and manual credits). ' +
    'xp = total XP, entries = credits, users = distinct users credited.',
  values: ['xp', 'entries', 'users'],
  usersValue: 'users',
  timeSeries: false,
  by: ['sourceType', 'dimension'],
  sql: ({ breakdowns, by }) => Prisma.sql`
    SELECT
      ${SOURCE_KEYS[by]} AS ${Prisma.raw(`"${by}"`)},
      ${breakdownColumns(breakdowns)},
      SUM(we."amount")::bigint AS "xp",
      COUNT(*)::int AS "entries",
      COUNT(DISTINCT we."userId")::int AS "users"
    FROM wallet_entries we
    JOIN users u ON u."id" = we."userId"
    LEFT JOIN missions m ON we."sourceType" = 'MISSION' AND m."id" = we."sourceId"
    LEFT JOIN challenges c ON we."sourceType" = 'CHALLENGE' AND c."id" = we."sourceId"
    LEFT JOIN quests q ON we."sourceType" = 'QUEST' AND q."id" = we."sourceId"
    LEFT JOIN quizzes qz ON we."sourceType" = 'QUIZ' AND qz."id" = we."sourceId"
    LEFT JOIN food_facts f ON we."sourceType" = 'FOOD_FACT' AND f."id" = we."sourceId"
    LEFT JOIN topics t ON t."id" = COALESCE(qz."topicId", f."topicId")
    LEFT JOIN dimensions d ON d."id" = COALESCE(m."dimensionId", c."dimensionId", q."dimensionId", t."dimensionId")
    WHERE we."currency" = 'XP' AND we."amount" > 0
    GROUP BY 1, "bd1", "bd2"
    ORDER BY "xp" DESC`,
};
