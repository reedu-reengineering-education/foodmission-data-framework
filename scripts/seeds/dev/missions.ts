import { Mission, PrismaClient } from '@prisma/client';
import { seedMissionsCatalog } from '../shared/missions-catalog';
import { KEYCLOAK_DEV_USER_IDS } from './keycloak-dev-user-ids';

/** Sparse demo progress for named Keycloak users only (not every seeded user). */
const demoProgressByKeycloakId: Record<
  string,
  { code: string; completed: boolean; progress: number }[]
> = {
  [KEYCLOAK_DEV_USER_IDS.devUser1]: [
    { code: 'M.B1.1', completed: false, progress: 40 },
    { code: 'M.B1.2', completed: true, progress: 100 },
  ],
  [KEYCLOAK_DEV_USER_IDS.adminUser1]: [
    { code: 'M.B1.1', completed: false, progress: 10 },
  ],
};

/**
 * Seed full Task 3.3 mission catalog, then attach sparse demo progress
 * for Keycloak dev users.
 */
export async function seedMissions(prisma: PrismaClient) {
  const missions = await seedMissionsCatalog(prisma);
  const missionByCode = new Map(missions.map((m) => [m.code, m]));
  let progressCount = 0;

  for (const [keycloakId, rows] of Object.entries(demoProgressByKeycloakId)) {
    const user = await prisma.user.findUnique({ where: { keycloakId } });
    if (!user) continue;

    for (const row of rows) {
      const mission = missionByCode.get(row.code);
      if (!mission) continue;

      await prisma.missionProgress.upsert({
        where: {
          userId_missionId: {
            userId: user.id,
            missionId: mission.id,
          },
        },
        update: {
          completed: row.completed,
          progress: row.progress,
        },
        create: {
          userId: user.id,
          missionId: mission.id,
          completed: row.completed,
          progress: row.progress,
        },
      });
      progressCount += 1;
    }
  }

  console.log(`✅ Created/updated ${progressCount} demo mission progress rows`);
  return missions as Mission[];
}
