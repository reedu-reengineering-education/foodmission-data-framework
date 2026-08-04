import { Challenge, PrismaClient } from '@prisma/client';
import { seedChallengesCatalog } from '../shared/challenges-catalog';
import { KEYCLOAK_DEV_USER_IDS } from './keycloak-dev-user-ids';

/** Sparse demo progress for named Keycloak users only (not every seeded user). */
const demoProgressByKeycloakId: Record<
  string,
  { code: string; completed: boolean; progress: number }[]
> = {
  [KEYCLOAK_DEV_USER_IDS.devUser1]: [
    { code: 'CH.B1.1', completed: true, progress: 100 },
    { code: 'CH.B1.2', completed: false, progress: 0 },
  ],
  [KEYCLOAK_DEV_USER_IDS.adminUser1]: [
    { code: 'CH.B1.1', completed: false, progress: 50 },
  ],
};

/**
 * Seed full Task 3.3 challenge catalog, then attach sparse demo progress
 * for Keycloak dev users.
 */
export async function seedChallenges(prisma: PrismaClient) {
  const challenges = await seedChallengesCatalog(prisma);
  const challengeByCode = new Map(challenges.map((c) => [c.code, c]));
  let progressCount = 0;

  for (const [keycloakId, rows] of Object.entries(demoProgressByKeycloakId)) {
    const user = await prisma.user.findUnique({ where: { keycloakId } });
    if (!user) continue;

    for (const row of rows) {
      const challenge = challengeByCode.get(row.code);
      if (!challenge) continue;

      await prisma.challengeProgress.upsert({
        where: {
          userId_challengeId: {
            userId: user.id,
            challengeId: challenge.id,
          },
        },
        update: {
          completed: row.completed,
          progress: row.progress,
        },
        create: {
          userId: user.id,
          challengeId: challenge.id,
          completed: row.completed,
          progress: row.progress,
        },
      });
      progressCount += 1;
    }
  }

  console.log(
    `✅ Created/updated ${progressCount} demo challenge progress rows`,
  );
  return challenges as Challenge[];
}
