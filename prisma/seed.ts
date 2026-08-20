import 'dotenv/config';
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { seedGenericFoods } from '../scripts/seeds/prod/genericFoods';
import { seedNevoLangualFoodex } from '../scripts/seeds/prod/seedNevoLangualFoodex';
import { seedOpenFoodFactsFromJson } from '../scripts/seeds/dev/openfoodfacts';
import { seedUsers } from '../scripts/seeds/dev/users';
import { seedShoppingLists } from '../scripts/seeds/dev/shoppingList';
import { seedShoppingListItems } from '../scripts/seeds/dev/shoppingListItem';
import { seedPantries } from '../scripts/seeds/dev/pantry';
import { seedPantryItems } from '../scripts/seeds/dev/pantryItem';
import { seedUserGroups } from '../scripts/seeds/dev/userGroups';
import { seedVirtualMembers } from '../scripts/seeds/dev/groupMembers';
import { seedChallenges } from '../scripts/seeds/dev/challenges';
import { seedMissions } from '../scripts/seeds/dev/missions';
import { seedGamificationProfiles } from '../scripts/seeds/dev/gamificationProfile';
import { seedRecipes } from '../scripts/seeds/prod/themealdb';
import { seedMeals } from '../scripts/seeds/dev/meals';
import { seedFoodKeeper } from '../scripts/seeds/prod/foodkeeper';
import { linkShelfLife } from '../scripts/seeds/prod/link-shelf-life';
import { seedSurveys } from '../scripts/seeds/prod/surveys';
import { seedDimensionsAndTopics } from '../scripts/seeds/shared/dimensions-topics';
import { seedStandardRewards } from '../scripts/seeds/shared/rewards';
import { seedFoodFacts } from '../scripts/seeds/shared/food-facts';
import { seedQuizzes } from '../scripts/seeds/shared/quizzes';
import { seedMissionsCatalog } from '../scripts/seeds/shared/missions-catalog';
import { seedChallengesCatalog } from '../scripts/seeds/shared/challenges-catalog';
import { seedQuests } from '../scripts/seeds/shared/quests';
import { seedMicroLearnings } from '../scripts/seeds/shared/micro-learnings';

const {
  values: { environment, force },
} = parseArgs({
  options: {
    environment: { type: 'string', default: 'development' },
    force: { type: 'boolean', default: false },
  },
});

const prisma = new PrismaClient();
const skipExisting = !(force ?? false);

function printTranslationsReminder(): void {
  console.log(
    '\nℹ️  DB translations are not loaded by seed. Run:\n' +
      '   npm run db:translations',
  );
}

async function seedProduction() {
  const taxonomy = await seedDimensionsAndTopics(prisma);
  const standardRewards = await seedStandardRewards(prisma);

  const foodFacts = await seedFoodFacts(prisma);
  const quizzes = await seedQuizzes(prisma);
  const missions = await seedMissionsCatalog(prisma);
  const challenges = await seedChallengesCatalog(prisma);
  const quests = await seedQuests(prisma);
  const microLearnings = await seedMicroLearnings(prisma);

  const genericFoods = await seedGenericFoods(prisma);
  // Backfill external classification codes (LanguaL / FoodEx2) from CSV
  const nevoLangualResult = await seedNevoLangualFoodex(prisma);
  const recipes = await seedRecipes(prisma);
  const shelfLife = await seedFoodKeeper(prisma);
  const shelfLifeLinks = await linkShelfLife(prisma);
  const surveys = await seedSurveys(prisma);
  const foodCount = await prisma.foodProduct.count();

  console.log('=====================================');
  console.log('✅ Production seeding completed!');
  console.log('📊 Summary:');
  const summaryRows: { label: string; value: string | number }[] = [
    {
      label: 'dimensionsAndTopics',
      value: `${taxonomy.dimensions} dimensions, ${taxonomy.topics} topics`,
    },
    {
      label: 'standardRewards',
      value: `${standardRewards.seeded} seeded (${standardRewards.total} total)`,
    },
    { label: 'foodFacts', value: foodFacts.seeded },
    {
      label: 'quizzes',
      value: `${quizzes.seeded} (${quizzes.needingCuration} need correctLabel)`,
    },
    { label: 'missions', value: missions.length },
    { label: 'challenges', value: challenges.length },
    {
      label: 'quests',
      value: `${quests.seeded} quests, ${quests.items} items`,
    },
    { label: 'microLearnings', value: microLearnings.seeded },
    { label: 'genericFoods', value: genericFoods.length },
    { label: 'nevoLangualMapping', value: `${nevoLangualResult.updated} updated, ${nevoLangualResult.missing} missing (${nevoLangualResult.processed} processed)` },
    {
      label: 'surveys',
      value: `${surveys.surveysCreated} surveys, ${surveys.questionsCreated} questions`,
    },
    {
      label: 'recipes',
      value: `${recipes.created} created, ${recipes.skipped} skipped`,
    },
    {
      label: 'shelfLife',
      value: `${shelfLife.created} created, ${shelfLife.skipped} skipped`,
    },
    {
      label: 'shelfLife links',
      value: `${shelfLifeLinks.foodProducts} food products, ${shelfLifeLinks.genericFoods} generic foods`,
    },
    { label: 'foodProducts (total in DB)', value: foodCount },
  ];
  for (const row of summaryRows) {
    console.log(`   - ${row.label}: ${row.value}`);
  }
  printTranslationsReminder();
}

async function seedDevelopment() {
  const taxonomy = await seedDimensionsAndTopics(prisma);
  const standardRewards = await seedStandardRewards(prisma);

  // --- Educational catalog (Task 3.3; missions/challenges after users for demo progress) ---
  const foodFacts = await seedFoodFacts(prisma);
  const quizzes = await seedQuizzes(prisma);
  const microLearnings = await seedMicroLearnings(prisma);

  // --- Catalog (needed for recipe ingredient linking & shelf-life matching) ---
  const offResult = await seedOpenFoodFactsFromJson(prisma);
  if (offResult.skipped) {
    console.log(
      '   ⏭️  OFF JSON not found; no OpenFoodFacts rows will be loaded into food_products. Run npx ts-node scripts/pull-openfoodfacts-foods.ts to generate it.',
    );
  }

  const genericFoods = await seedGenericFoods(prisma, { skipExisting });
  // Backfill external classification codes (LanguaL / FoodEx2) from CSV
  const nevoLangualResult = await seedNevoLangualFoodex(prisma);

  // --- Identity & user-owned data (lists reference users; items may create FoodProduct stubs by name) ---
  const users = await seedUsers(prisma);
  const shoppingList = await seedShoppingLists(prisma);
  const shoppingListItem = await seedShoppingListItems(prisma);
  const pantry = await seedPantries(prisma);
  const pantryItem = await seedPantryItems(prisma);

  // --- Groups & gamification (catalog missions/challenges + sparse Keycloak demo progress) ---
  const userGroups = await seedUserGroups(prisma);
  const virtualMembers = await seedVirtualMembers(prisma);
  const challenges = await seedChallenges(prisma);
  const missions = await seedMissions(prisma);
  const quests = await seedQuests(prisma);
  const gamificationProfiles = await seedGamificationProfiles(prisma);

  // --- Recipes then meals (meals attach to seeded recipes) ---
  const recipes = await seedRecipes(prisma, { skipExisting });
  const meals = await seedMeals(prisma);

  // --- Shelf-life reference data, then link rows onto FoodProduct / GenericFood ---
  const shelfLife = await seedFoodKeeper(prisma, { skipExisting });
  const shelfLifeLinks = await linkShelfLife(prisma);

  // --- Surveys ---
  const surveys = await seedSurveys(prisma);

  const foodCount = await prisma.foodProduct.count();

  console.log('=====================================');
  console.log('✅ Database seeding completed successfully!');
  console.log('📊 Summary:');
  const summaryRows: { label: string; value: string | number }[] = [
    {
      label: 'dimensionsAndTopics',
      value: `${taxonomy.dimensions} dimensions, ${taxonomy.topics} topics`,
    },
    {
      label: 'standardRewards',
      value: `${standardRewards.seeded} seeded (${standardRewards.total} total)`,
    },
    { label: 'foodFacts', value: foodFacts.seeded },
    {
      label: 'quizzes',
      value: `${quizzes.seeded} (${quizzes.needingCuration} need correctLabel)`,
    },
    { label: 'missions', value: missions.length },
    { label: 'challenges', value: challenges.length },
    {
      label: 'quests',
      value: `${quests.seeded} quests, ${quests.items} items`,
    },
    { label: 'microLearnings', value: microLearnings.seeded },
    {
      label: 'openFoodFactsJson',
      value: offResult.skipped ? 'skipped' : `${offResult.count} rows upserted`,
    },
    { label: 'genericFoods', value: genericFoods.length },
    { label: 'nevoLangualMapping', value: `${nevoLangualResult.updated} updated, ${nevoLangualResult.missing} missing (${nevoLangualResult.processed} processed)` },
    { label: 'users', value: users.length },
    { label: 'shoppingList', value: shoppingList.length },
    { label: 'shoppingListItem', value: shoppingListItem.length },
    { label: 'pantry', value: pantry.length },
    { label: 'pantryItem', value: pantryItem.length },
    { label: 'userGroups', value: userGroups.length },
    { label: 'virtualMembers', value: virtualMembers.length },
    {
      label: 'gamificationProfiles',
      value: `${gamificationProfiles.wallets} wallets, ${gamificationProfiles.events} events, ${gamificationProfiles.walletEntries} wallet entries`,
    },
    {
      label: 'surveys',
      value: `${surveys.surveysCreated} surveys, ${surveys.questionsCreated} questions`,
    },
    {
      label: 'recipes',
      value: `${recipes.created} created, ${recipes.skipped} skipped`,
    },
    { label: 'meals (linked to recipes)', value: meals.length },
    {
      label: 'shelfLife',
      value: `${shelfLife.created} created, ${shelfLife.skipped} skipped`,
    },
    {
      label: 'shelfLife links',
      value: `${shelfLifeLinks.foodProducts} food products, ${shelfLifeLinks.genericFoods} generic foods`,
    },
    { label: 'foodProducts (total in DB)', value: foodCount },
  ];
  for (const row of summaryRows) {
    console.log(`   - ${row.label}: ${row.value}`);
  }
  printTranslationsReminder();
}

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log(`   environment: ${environment}`);
  console.log(`   skipExisting: ${skipExisting}`);
  console.log('=====================================');

  try {
    if (environment === 'production') {
      await seedProduction();
    } else {
      await seedDevelopment();
    }
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
