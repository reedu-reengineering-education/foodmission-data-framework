// missions.seed.ts
import { Mission, MissionProgress, PrismaClient } from '@prisma/client';
import { getMissionSeedCopy } from './gamification-seed-copy';

export interface MissionSeedData {
  slug: string;
  available: boolean;
  startDate: Date;
  endDate: Date;
}

export const missionData: MissionSeedData[] = [
  {
    slug: 'plastic-free-month',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-31'),
  },
  {
    slug: 'sustainable-home-makeover',
    available: true,
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-04-30'),
  },
  {
    slug: 'zero-waste-warrior',
    available: true,
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-03-31'),
  },
  {
    slug: 'plant-based-journey',
    available: true,
    startDate: new Date('2026-01-15'),
    endDate: new Date('2026-03-15'),
  },
  {
    slug: 'green-transportation-champion',
    available: true,
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-05-31'),
  },
  {
    slug: 'community-garden-hero',
    available: true,
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-09-30'),
  },
  {
    slug: 'energy-independence-quest',
    available: false,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-08-31'),
  },
  {
    slug: 'water-conservation-master',
    available: false,
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-09-30'),
  },
  {
    slug: 'office-sustainability-initiative',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-30'),
  },
  {
    slug: 'carbon-footprint-reducer',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-30'),
  },
];

export async function seedMissions(prisma: PrismaClient) {
  console.log('🎯 Seeding missions and mission progress...');

  const users = await prisma.user.findMany();

  if (users.length === 0) {
    console.warn('⚠️ No users found, skipping mission progress seeding');
  }

  const missions: Mission[] = [];
  const missionProgresses: MissionProgress[] = [];

  for (const missionInfo of missionData) {
    const copy = getMissionSeedCopy(missionInfo.slug);

    const mission = await prisma.mission.upsert({
      where: { slug: missionInfo.slug },
      update: {
        title: copy.title,
        description: copy.description,
        available: missionInfo.available,
        startDate: missionInfo.startDate,
        endDate: missionInfo.endDate,
      },
      create: {
        slug: missionInfo.slug,
        title: copy.title,
        description: copy.description,
        available: missionInfo.available,
        startDate: missionInfo.startDate,
        endDate: missionInfo.endDate,
      },
    });

    missions.push(mission);
  }

  for (const user of users) {
    for (const mission of missions) {
      const isCompleted = Math.random() > 0.8;
      const progress = isCompleted ? 100 : Math.floor(Math.random() * 85);

      const missionProgress = await prisma.missionProgress.upsert({
        where: {
          userId_missionId: {
            userId: user.id,
            missionId: mission.id,
          },
        },
        update: {
          completed: isCompleted,
          progress: progress,
        },
        create: {
          userId: user.id,
          missionId: mission.id,
          completed: isCompleted,
          progress: progress,
        },
      });

      missionProgresses.push(missionProgress);
    }
  }

  console.log(`✅ Created/updated ${missions.length} missions`);
  console.log(
    `✅ Created/updated ${missionProgresses.length} mission progress records for ${users.length} users`,
  );
  return missions;
}
