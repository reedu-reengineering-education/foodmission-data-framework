import { Prisma } from '@prisma/client';

const PROGRESS_TABLES = {
  quiz: { table: 'quiz_progress', column: 'quizId' },
  quest: { table: 'quest_progress', column: 'questId' },
  mission: { table: 'mission_progress', column: 'missionId' },
  challenge: { table: 'challenge_progress', column: 'challengeId' },
} as const;

export type ProgressRowKind = keyof typeof PROGRESS_TABLES;

export async function lockProgressRow(
  tx: Prisma.TransactionClient,
  kind: ProgressRowKind,
  userId: string,
  itemId: string,
): Promise<void> {
  const { table, column } = PROGRESS_TABLES[kind];
  await tx.$queryRaw`
    SELECT 1 FROM ${Prisma.raw(`"${table}"`)}
    WHERE "userId" = ${userId} AND ${Prisma.raw(`"${column}"`)} = ${itemId}
    FOR UPDATE
  `;
}
