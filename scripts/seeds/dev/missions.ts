import {
  ContentLevel,
  Mission,
  PrismaClient,
} from '@prisma/client';
import { KEYCLOAK_DEV_USER_IDS } from './keycloak-dev-user-ids';

export interface MissionSeedData {
  code: string;
  title: string;
  duration: string;
  goal: string;
  whyItMatters: string;
  health?: boolean;
  foodChoice?: boolean;
  foodWaste?: boolean;
  available: boolean;
}

export const missionData: MissionSeedData[] = [
  {
    code: 'M.B1.1',
    title: 'Plastic-Free Week',
    duration: '1 week',
    goal: 'Eliminate single-use plastics from your daily routine for 7 days',
    whyItMatters:
      'Cutting disposable plastic reduces waste that harms oceans and wildlife',
    foodChoice: true,
    foodWaste: true,
    available: true,
  },
  {
    code: 'M.B1.2',
    title: 'Plant-Forward Week',
    duration: '1 week',
    goal: 'Make plant-based meals the majority of your dinners for a week',
    whyItMatters:
      'Shifting toward plant foods lowers environmental impact and supports healthier choices',
    health: true,
    foodChoice: true,
    available: true,
  },
  {
    code: 'M.B1.3',
    title: 'Food Waste Watch',
    duration: '1 week',
    goal: 'Track and reduce edible food waste in your household for one week',
    whyItMatters:
      'Preventing food waste saves resources used to grow, transport, and store food',
    foodWaste: true,
    available: true,
  },
];

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

export async function seedMissions(prisma: PrismaClient) {
  console.log('🎯 Seeding missions...');

  const dimension = await prisma.dimension.findUnique({
    where: { code: 'DIET_CHANGES' },
  });

  if (!dimension) {
    console.warn(
      '⚠️ Dimension DIET_CHANGES not found, skipping mission seeding',
    );
    return [];
  }

  const missions: Mission[] = [];

  for (const missionInfo of missionData) {
    const mission = await prisma.mission.upsert({
      where: { code: missionInfo.code },
      update: {
        dimensionId: dimension.id,
        level: ContentLevel.BEGINNER,
        title: missionInfo.title,
        duration: missionInfo.duration,
        goal: missionInfo.goal,
        whyItMatters: missionInfo.whyItMatters,
        health: missionInfo.health ?? false,
        foodChoice: missionInfo.foodChoice ?? false,
        foodWaste: missionInfo.foodWaste ?? false,
        available: missionInfo.available,
      },
      create: {
        code: missionInfo.code,
        dimensionId: dimension.id,
        level: ContentLevel.BEGINNER,
        title: missionInfo.title,
        duration: missionInfo.duration,
        goal: missionInfo.goal,
        whyItMatters: missionInfo.whyItMatters,
        health: missionInfo.health ?? false,
        foodChoice: missionInfo.foodChoice ?? false,
        foodWaste: missionInfo.foodWaste ?? false,
        available: missionInfo.available,
      },
    });

    missions.push(mission);
  }

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

  console.log(`✅ Created/updated ${missions.length} missions`);
  console.log(`✅ Created/updated ${progressCount} demo mission progress rows`);
  return missions;
}
