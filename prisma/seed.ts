import { PrismaClient } from '@prisma/client';
import { seedFoods } from './seeds/foods';
import { seedUsers } from './seeds/users';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log('=====================================');

  try {
    // Seed foods
    const foods = await seedFoods(prisma);

    // Seed users and preferences
    const users = await seedUsers(prisma);

    console.log('=====================================');
    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Foods: ${foods.length}`);
    console.log(`   - Users: ${users.length}`);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
