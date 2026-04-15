import { PrismaClient } from '@prisma/client';
import { seedNevo } from './seed-nevo';
import { seedOpenFoodFactsFromJson } from '../prisma/seeds/openfoodfacts';
import { seedRecipes } from '../prisma/seeds/themealdb';
import { seedFoodKeeper } from '../prisma/seeds/foodkeeper';
import { linkShelfLife } from '../prisma/seeds/link-shelf-life';

async function main() {
  const prisma = new PrismaClient();

  console.log('🔒 Running production seed (NEVO + OpenFoodFacts + Recipes)');

  try {
    const nevoRes = await seedNevo(prisma);
    if (nevoRes && nevoRes.skipped) {
      console.log('   ⏭️  NEVO CSV not found; skipping NEVO import.');
    } else if (nevoRes && typeof nevoRes.count === 'number') {
      console.log(`   ✅ NEVO: ${nevoRes.count} categories created`);
    }

    const offRes = await seedOpenFoodFactsFromJson(prisma);
    if (offRes && offRes.skipped) {
      console.log(
        '   ⏭️  OpenFoodFacts JSON not found; Food table will have no OFF products.',
      );
    } else if (offRes && typeof offRes.count === 'number') {
      console.log(`   ✅ OpenFoodFacts JSON: ${offRes.count} foods upserted`);
    }

    const result = await seedRecipes(prisma, { skipExisting: true });
    if (result?.errors && result.errors > 0) {
      console.error(
        `   ❌ Recipe seeding completed with ${result.errors} errors`,
      );
      process.exitCode = 1;
    } else {
      console.log(
        `   ✅ Recipes: ${result?.created ?? 0} created, ${result?.skipped ?? 0} skipped`,
      );
    }

    const shelfLifeRes = await seedFoodKeeper(prisma, { skipExisting: true });
    if (shelfLifeRes.errors > 0) {
      console.error(
        `   ❌ ShelfLife seeding completed with ${shelfLifeRes.errors} errors`,
      );
      process.exitCode = 1;
    } else {
      console.log(
        `   ✅ ShelfLife: ${shelfLifeRes.created} created, ${shelfLifeRes.skipped} skipped`,
      );
    }

    const shelfLifeLinks = await linkShelfLife(prisma);
    console.log(
      `   ✅ ShelfLife links: ${shelfLifeLinks.foods} foods, ${shelfLifeLinks.categories} categories`,
    );
  } catch (err) {
    console.error('❌ Error during prod seed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Seed failed', err);
  process.exitCode = 1;
});
