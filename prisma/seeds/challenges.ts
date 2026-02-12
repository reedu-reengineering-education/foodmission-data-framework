// challenges.seed.ts
import { PrismaClient, Challenges } from '@prisma/client';

export interface ChallengeSeedData {
  title: string;
  description: string;
  available: boolean;
}

export const challengeData: ChallengeSeedData[] = [
  { 
    title: 'Bring Your Own Bag', 
    description: 'Use a reusable shopping bag for your groceries today',
    available: true,
  },
  { 
    title: 'Meatless Monday', 
    description: 'Go vegetarian for the entire day',
    available: true,
  },
  { 
    title: 'Water Bottle Warrior', 
    description: 'Drink only from your reusable water bottle today',
    available: true,
  },
  { 
    title: 'Zero Waste Shopping', 
    description: 'Buy products with minimal or no packaging',
    available: true,
  },
  { 
    title: 'Local Hero', 
    description: 'Purchase at least 3 locally sourced products',
    available: true,
  },
  { 
    title: 'Bike to Work', 
    description: 'Use your bicycle instead of driving today',
    available: true,
  },
  { 
    title: 'Energy Saver', 
    description: 'Unplug all unused devices for the day',
    available: true,
  },
  { 
    title: 'Compost Champion', 
    description: 'Start composting your organic waste today',
    available: false,
  },
  { 
    title: 'Digital Detox Hour', 
    description: 'Spend one hour without any electronic devices',
    available: true,
  },
  { 
    title: 'Green Commute', 
    description: 'Use public transportation or walk to work',
    available: true,
  },
];

export async function seedChallenges(prisma: PrismaClient) {
  console.log('🏆 Seeding challenges...');
  
  const users = await prisma.user.findMany();
  
  if (users.length === 0) {
    console.warn('⚠️ No users found, skipping challenges seeding');
    return [];
  }
  
  const challenges: Challenges[] = [];
  
  for (const user of users) {
    for (const challengeInfo of challengeData) {
      // Randomize progress and completion for variety
      const isCompleted = Math.random() > 0.7; // 30% chance of being completed
      const progress = isCompleted ? 100 : Math.floor(Math.random() * 90);
      
      const challenge = await prisma.challenges.upsert({
        where: {
          id: `${user.id}-${challengeInfo.title.replace(/\s+/g, '-').toLowerCase()}`,
        },
        update: {
          description: challengeInfo.description,
          available: challengeInfo.available,
          completed: isCompleted,
          progress: progress,
        },
        create: {
          title: challengeInfo.title,
          description: challengeInfo.description,
          available: challengeInfo.available,
          completed: isCompleted,
          progress: progress,
          userId: user.id,
        },
      });
      
      challenges.push(challenge);
    }
  }
  
  console.log(`✅ Created/updated ${challenges.length} challenges for ${users.length} users`);
  return challenges;
}