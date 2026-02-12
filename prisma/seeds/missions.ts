// missions.seed.ts
import { Missions, PrismaClient } from '@prisma/client';

export interface MissionSeedData {
  title: string;
  description: string;
  available: boolean;
}

export const missionData: MissionSeedData[] = [
  { 
    title: 'Plastic-Free Month', 
    description: 'Eliminate single-use plastics from your life for 30 days',
    available: true,
  },
  { 
    title: 'Sustainable Home Makeover', 
    description: 'Replace 10 household items with eco-friendly alternatives',
    available: true,
  },
  { 
    title: 'Zero Waste Warrior', 
    description: 'Reduce your household waste to less than 1kg per week for a month',
    available: true,
  },
  { 
    title: 'Plant-Based Journey', 
    description: 'Transition to a fully plant-based diet over 8 weeks',
    available: true,
  },
  { 
    title: 'Green Transportation Champion', 
    description: 'Use only eco-friendly transport methods for 60 days',
    available: true,
  },
  { 
    title: 'Community Garden Hero', 
    description: 'Start and maintain a community garden plot for a season',
    available: true,
  },
  { 
    title: 'Energy Independence Quest', 
    description: 'Reduce household energy consumption by 30% over 3 months',
    available: false,
  },
  { 
    title: 'Water Conservation Master', 
    description: 'Cut water usage by 40% through sustainable practices',
    available: false,
  },
  { 
    title: 'Office Sustainability Initiative', 
    description: 'Implement 5 eco-friendly practices in your workplace',
    available: true,
  },
  { 
    title: 'Carbon Footprint Reducer', 
    description: 'Decrease personal carbon emissions by 50% over 6 months',
    available: true,
  },
];

export async function seedMissions(prisma: PrismaClient) {
  console.log('🎯 Seeding missions...');
  
  const users = await prisma.user.findMany();
  
  if (users.length === 0) {
    console.warn('⚠️ No users found, skipping missions seeding');
    return [];
  }
  
  const missions: Missions[] = [];
  
  for (const user of users) {
    for (const missionInfo of missionData) {
      const isCompleted = Math.random() > 0.8; 
      const progress = isCompleted ? 100 : Math.floor(Math.random() * 85);
      
      const mission = await prisma.missions.upsert({
        where: {
          id: `${user.id}-${missionInfo.title.replace(/\s+/g, '-').toLowerCase()}`,
        },
        update: {
          description: missionInfo.description,
          available: missionInfo.available,
          completed: isCompleted,
          progress: progress,
        },
        create: {
          title: missionInfo.title,
          description: missionInfo.description,
          available: missionInfo.available,
          completed: isCompleted,
          progress: progress,
          userId: user.id,
        },
      });
      
      missions.push(mission);
    }
  }
  
  console.log(`✅ Created/updated ${missions.length} missions for ${users.length} users`);
  return missions;
}