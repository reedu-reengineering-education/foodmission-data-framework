import { Prisma } from '@prisma/client';

const PROGRESS_TABLES = {
  mission: { table: 'mission_progress', column: 'missionId' },
  challenge: { table: 'challenge_progress', column: 'challengeId' },
} as const;

export type LockedProgressRow = {
  progress: number;
  completed: boolean;
  startedAt: Date | null;
  status: string;
  inputs?: Prisma.JsonValue;
};

export async function findProgressForUpdate(
  tx: Prisma.TransactionClient,
  kind: keyof typeof PROGRESS_TABLES,
  userId: string,
  itemId: string,
): Promise<LockedProgressRow | null> {
  const { table, column } = PROGRESS_TABLES[kind];
  const inputs = kind === 'mission' ? Prisma.sql`, inputs` : Prisma.empty;
  const rows = await tx.$queryRaw<LockedProgressRow[]>`
    SELECT progress, completed, "startedAt", status::text AS status${inputs}
    FROM ${Prisma.raw(`"${table}"`)}
    WHERE "userId" = ${userId} AND ${Prisma.raw(`"${column}"`)} = ${itemId}
    FOR UPDATE
  `;
  return rows[0] ?? null;
}
