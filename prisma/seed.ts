import 'dotenv/config';
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { seedGenericFoods } from '../scripts/seeds/prod/genericFoods';
import { seedOpenFoodFactsFromJson } from '../scripts/seeds/dev/openfoodfacts';
import { seedUsers } from '../scripts/seeds/dev/users';
import { seedShoppingLists } from '../scripts/seeds/dev/shoppingList';
import { seedShoppingListItems } from '../scripts/seeds/dev/shoppingListItem';
import { seedPantries } from '../scripts/seeds/dev/pantry';
import { seedPantryItems } from '../scripts/seeds/dev/pantryItem';
import { seedUserGroups } from '../scripts/seeds/dev/userGroups';
import { seedVirtualMembers } from '../scripts/seeds/dev/groupMembers';
import {
  seedKnowledge,
  seedUserKnowledgeProgress,
} from '../scripts/seeds/dev/knowledge';
import { seedChallenges } from '../scripts/seeds/dev/challenges';
import { seedMissions } from '../scripts/seeds/dev/missions';
import { seedRecipes } from '../scripts/seeds/prod/themealdb';
import { seedMeals } from '../scripts/seeds/dev/meals';
import { seedFoodKeeper } from '../scripts/seeds/prod/foodkeeper';
import { linkShelfLife } from '../scripts/seeds/prod/link-shelf-life';
import { seedSurveys } from '../scripts/seeds/prod/surveys';
import { seedSustainabilityTaxonomy } from '../scripts/seeds/shared/sustainability-taxonomy';
import { seedStandardRewards } from '../scripts/seeds/shared/rewards';

const {
  values: { environment },
} = parseArgs({
  options: {
    environment: { type: 'string', default: 'development' },
  },
});

const prisma = new PrismaClient();

async function seedProduction() {
  const sustainabilityTaxonomy = await seedSustainabilityTaxonomy(prisma);
  const standardRewards = await seedStandardRewards(prisma);
  const genericFoods = await seedGenericFoods(prisma);
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
      label: 'sustainabilityTaxonomy',
      value: `${sustainabilityTaxonomy.dimensions} dimensions, ${sustainabilityTaxonomy.topics} topics`,
    },
    {
      label: 'standardRewards',
      value: `${standardRewards.seeded} seeded (${standardRewards.total} total)`,
    },
    { label: 'genericFoods', value: genericFoods.length },
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
}

async function seedDevelopment() {
  const sustainabilityTaxonomy = await seedSustainabilityTaxonomy(prisma);
  const standardRewards = await seedStandardRewards(prisma);

  // --- Catalog (needed for recipe ingredient linking & shelf-life matching) ---
  const offResult = await seedOpenFoodFactsFromJson(prisma);
  if (offResult.skipped) {
    console.log(
      '   ⏭️  OFF JSON not found; no OpenFoodFacts rows will be loaded into food_products. Run npx ts-node scripts/pull-openfoodfacts-foods.ts to generate it.',
    );
  }

  const genericFoods = await seedGenericFoods(prisma);

  // --- Identity & user-owned data (lists reference users; items may create FoodProduct stubs by name) ---
  const users = await seedUsers(prisma);
  const shoppingList = await seedShoppingLists(prisma);
  const shoppingListItem = await seedShoppingListItems(prisma);
  const pantry = await seedPantries(prisma);
  const pantryItem = await seedPantryItems(prisma);

  // --- Groups & gamification (missions/challenges do not depend on recipes here) ---
  const userGroups = await seedUserGroups(prisma);
  const virtualMembers = await seedVirtualMembers(prisma);
  const knowledge = await seedKnowledge(prisma);
  const knowledgeProgress = await seedUserKnowledgeProgress(prisma);
  const challenges = await seedChallenges(prisma);
  const missions = await seedMissions(prisma);

  // --- Recipes then meals (meals attach to seeded recipes) ---
  const recipes = await seedRecipes(prisma);
  const meals = await seedMeals(prisma);

  // --- Shelf-life reference data, then link rows onto FoodProduct / GenericFood ---
  const shelfLife = await seedFoodKeeper(prisma);
  const shelfLifeLinks = await linkShelfLife(prisma);

  // --- Surveys ---
  const surveys = await seedSurveys(prisma);

  const foodCount = await prisma.foodProduct.count();

  console.log('=====================================');
  console.log('✅ Database seeding completed successfully!');
  console.log('📊 Summary:');
  const summaryRows: { label: string; value: string | number }[] = [
    {
      label: 'sustainabilityTaxonomy',
      value: `${sustainabilityTaxonomy.dimensions} dimensions, ${sustainabilityTaxonomy.topics} topics`,
    },
    {
      label: 'standardRewards',
      value: `${standardRewards.seeded} seeded (${standardRewards.total} total)`,
    },
    {
      label: 'openFoodFactsJson',
      value: offResult.skipped ? 'skipped' : `${offResult.count} rows upserted`,
    },
    { label: 'genericFoods', value: genericFoods.length },
    { label: 'users', value: users.length },
    { label: 'shoppingList', value: shoppingList.length },
    { label: 'shoppingListItem', value: shoppingListItem.length },
    { label: 'pantry', value: pantry.length },
    { label: 'pantryItem', value: pantryItem.length },
    { label: 'userGroups', value: userGroups.length },
    { label: 'virtualMembers', value: virtualMembers.length },
    { label: 'knowledge', value: knowledge.length },
    { label: 'knowledgeProgress', value: knowledgeProgress.length },
    { label: 'challenges', value: challenges.length },
    { label: 'missions', value: missions.length },
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
}

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log(`   environment: ${environment}`);
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
