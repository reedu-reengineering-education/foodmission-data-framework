import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanMealLogs() {
  console.log('Starting cleanup...\n');

  // Count existing data
  const mealLogCount = await prisma.mealLog.count();
  const mealItemCount = await prisma.mealItem.count();
  const mealCount = await prisma.meal.count();

  console.log('Current data:');
  console.log(`  Meal logs: ${mealLogCount}`);
  console.log(`  Meal items: ${mealItemCount}`);
  console.log(`  Meals: ${mealCount}\n`);

  if (mealLogCount === 0 && mealCount === 0) {
    console.log('✓ No data to clean');
    return;
  }

  // Delete in correct order (respecting foreign keys)
  console.log('Deleting meal logs...');
  const deletedLogs = await prisma.mealLog.deleteMany({});
  console.log(`✓ Deleted ${deletedLogs.count} meal logs`);

  console.log('Deleting meal items...');
  const deletedItems = await prisma.mealItem.deleteMany({});
  console.log(`✓ Deleted ${deletedItems.count} meal items`);

  console.log('Deleting meals...');
  const deletedMeals = await prisma.meal.deleteMany({});
  console.log(`✓ Deleted ${deletedMeals.count} meals`);

  console.log('\n✅ Cleanup completed!');
}

cleanMealLogs()
  .catch((e) => {
    console.error('\n❌ Cleanup failed:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
