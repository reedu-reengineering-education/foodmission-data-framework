import { PrismaClient } from '@prisma/client';
import { seedGenericFoods } from './prod/genericFoods';
import { seedOpenFoodFactsFromJson } from './dev/openfoodfacts';
import { seedRecipes } from './prod/themealdb';
import { seedFoodKeeper } from './prod/foodkeeper';
import { linkShelfLife } from './prod/link-shelf-life';
import { seedDimensionsAndTopics } from './shared/dimensions-topics';
import { seedStandardRewards } from './shared/rewards';
import { seedFoodFacts } from './shared/food-facts';
import { seedQuizzes } from './shared/quizzes';
import { seedMissionsCatalog } from './shared/missions-catalog';
import { seedChallengesCatalog } from './shared/challenges-catalog';
import { seedQuests } from './shared/quests';
import { seedMicroLearnings } from './shared/micro-learnings';

async function main() {
  const prisma = new PrismaClient();

  console.log(
    '🔒 Running production seed (taxonomy + catalog + NEVO + OFF + Recipes)',
  );

  try {
    const taxonomyRes = await seedDimensionsAndTopics(prisma);
    console.log(
      `   ✅ Dimensions/topics: ${taxonomyRes.dimensions} dimensions, ${taxonomyRes.topics} topics`,
    );

    const rewardsRes = await seedStandardRewards(prisma);
    console.log(
      `   ✅ Standard rewards: ${rewardsRes.seeded} seeded (${rewardsRes.total} total)`,
    );

    const foodFacts = await seedFoodFacts(prisma);
    console.log(`   ✅ Food facts: ${foodFacts.seeded} upserted`);

    const quizzes = await seedQuizzes(prisma);
    console.log(
      `   ✅ Quizzes: ${quizzes.seeded} upserted (${quizzes.needingCuration} need correctLabel)`,
    );

    const missions = await seedMissionsCatalog(prisma);
    console.log(`   ✅ Missions: ${missions.length} upserted`);

    const challenges = await seedChallengesCatalog(prisma);
    console.log(`   ✅ Challenges: ${challenges.length} upserted`);

    const quests = await seedQuests(prisma);
    console.log(
      `   ✅ Quests: ${quests.seeded} upserted (${quests.items} items)`,
    );

    const microLearnings = await seedMicroLearnings(prisma);
    console.log(`   ✅ Micro-learnings: ${microLearnings.seeded} upserted`);

    const genericFoods = await seedGenericFoods(prisma, { skipExisting: true });
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
      '\n   ℹ️  Run npm run db:translations to load food name translations.',
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
