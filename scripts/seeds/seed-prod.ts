import { PrismaClient } from '@prisma/client';
import { seedGenericFoods } from './prod/genericFoods';
import { seedOpenFoodFactsFromJson } from './dev/openfoodfacts';
import { seedRecipes } from './prod/themealdb';
import { seedFoodKeeper } from './prod/foodkeeper';
import { linkShelfLife } from './prod/link-shelf-life';

async function main() {
  const prisma = new PrismaClient();

  console.log('🔒 Running production seed (NEVO + OpenFoodFacts + Recipes)');

  try {
    const genericFoods = await seedGenericFoods(prisma);
    console.log(`   ✅ NEVO: ${genericFoods.length} generic foods upserted`);

    const offRes = await seedOpenFoodFactsFromJson(prisma);
    if (offRes && offRes.skipped) {
      console.log(
        '   ⏭️  OpenFoodFacts JSON not found; FoodProduct table will have no OFF products.',
      );
    } else if (offRes && typeof offRes.count === 'number') {
      console.log(
        `   ✅ OpenFoodFacts JSON: ${offRes.count} foodProducts upserted`,
      );
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
      `   ✅ ShelfLife links: ${shelfLifeLinks.foodProducts} foodProducts, ${shelfLifeLinks.genericFoods} genericFoods`,
    );

    console.log(
      '\n   ℹ️  Run npm run db:import:nevo-translations to load food name translations.',
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
