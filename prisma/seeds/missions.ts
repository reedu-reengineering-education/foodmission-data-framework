// missions.seed.ts
import { Mission, MissionProgress, PrismaClient } from '@prisma/client';

export interface MissionSeedData {
  title: string;
  description: string;
  available: boolean;
  startDate: Date;
  endDate: Date;
}

export const missionData: MissionSeedData[] = [
  { 
    title: 'Plastic-Free Month', 
    description: 'Eliminate single-use plastics from your life for 30 days',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-31'),
  },
  { 
    title: 'Sustainable Home Makeover', 
    description: 'Replace 10 household items with eco-friendly alternatives',
    available: true,
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-04-30'),
  },
  { 
    title: 'Zero Waste Warrior', 
    description: 'Reduce your household waste to less than 1kg per week for a month',
    available: true,
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-03-31'),
  },
  { 
    title: 'Plant-Based Journey', 
    description: 'Transition to a fully plant-based diet over 8 weeks',
    available: true,
    startDate: new Date('2026-01-15'),
    endDate: new Date('2026-03-15'),
  },
  { 
    title: 'Green Transportation Champion', 
    description: 'Use only eco-friendly transport methods for 60 days',
    available: true,
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-05-31'),
  },
  { 
    title: 'Community Garden Hero', 
    description: 'Start and maintain a community garden plot for a season',
    available: true,
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-09-30'),
  },
  { 
    title: 'Energy Independence Quest', 
    description: 'Reduce household energy consumption by 30% over 3 months',
    available: false,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-08-31'),
  },
  { 
    title: 'Water Conservation Master', 
    description: 'Cut water usage by 40% through sustainable practices',
    available: false,
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-09-30'),
  },
  { 
    title: 'Office Sustainability Initiative', 
    description: 'Implement 5 eco-friendly practices in your workplace',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-30'),
  },
  { 
    title: 'Carbon Footprint Reducer', 
    description: 'Decrease personal carbon emissions by 50% over 6 months',
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
  
  // First, create all missions
  for (const missionInfo of missionData) {
    const mission = await prisma.mission.upsert({
      where: {
        id: missionInfo.title.replace(/\s+/g, '-').toLowerCase(),
      },
      update: {
        title: missionInfo.title,
        description: missionInfo.description,
        available: missionInfo.available,
        startDate: missionInfo.startDate,
        endDate: missionInfo.endDate,
      },
      create: {
        id: missionInfo.title.replace(/\s+/g, '-').toLowerCase(),
        title: missionInfo.title,
        description: missionInfo.description,
        available: missionInfo.available,
        startDate: missionInfo.startDate,
        endDate: missionInfo.endDate,
      },
    });
    
    missions.push(mission);
  }
  
  // Then, create mission progress for each user
  for (const user of users) {
    for (const mission of missions) {
      // Randomize progress and completion for variety
      const isCompleted = Math.random() > 0.8; // 20% chance of being completed
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
  console.log(`✅ Created/updated ${missionProgresses.length} mission progress records for ${users.length} users`);
  return missions;
}