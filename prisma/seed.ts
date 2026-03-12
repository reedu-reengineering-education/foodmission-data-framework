import { PrismaClient } from '@prisma/client';
import { seedOpenFoodFactsFromCsv } from './seeds/openfoodfacts-from-csv';
import { seedUsers } from './seeds/users';
import { seedShoppingLists } from './seeds/shoppingList';
import { seedShoppingListItems } from './seeds/shoppingListItem';
import { seedPantries } from './seeds/pantry';
import { seedPantryItems } from './seeds/pantryItem';
import { seedMissions } from './seeds/missions';
import { seedChallenges } from './seeds/challenges';
import { seedFoodCategories } from './seeds/foodCategories';
import { seedUserGroups } from './seeds/userGroups';
import { seedVirtualMembers } from './seeds/groupMembers';
import { seedKnowledge, seedUserKnowledgeProgress } from './seeds/knowledge';
import { seedTheMealDbRecipes } from './seeds/themealdb';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log('=====================================');

  try {
    const foods = await seedFoods(prisma);
    // 1. OpenFoodFacts from local CSV only (no API). Recipe ingredients with source=off link to Food by name.
    const offResult = await seedOpenFoodFactsFromCsv(prisma);
    if (offResult.skipped) {
      console.log('   ⏭️  OFF CSV not found; Food table will have no OFF products. Run npx ts-node scripts/pull-openfoodfacts-foods.ts to generate it.');
    }

    const users = await seedUsers(prisma);
    const shoppingList = await seedShoppingLists(prisma);
    const shoppingListItem = await seedShoppingListItems(prisma);
    const pantry = await seedPantries(prisma);
    const pantryItem = await seedPantryItems(prisma);
    // 2. Food categories (NEVO) – required before TheMealDB so ingredient→FoodCategory links work
    const foodCategories = await seedFoodCategories(prisma);
    const userGroups = await seedUserGroups(prisma);
    const virtualMembers = await seedVirtualMembers(prisma);
    const knowledge = await seedKnowledge(prisma);
    const knowledgeProgress = await seedUserKnowledgeProgress(prisma);
    const challenges = await seedChallenges(prisma);

    const missions = await seedMissions(prisma);
    // 3. TheMealDB recipes (depends on Food + FoodCategory being seeded)
    const themealdbResult = await seedTheMealDbRecipes(prisma);

    console.log('=====================================');
    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - userGroups: ${userGroups.length}`);
    console.log(`   - virtualMembers: ${virtualMembers.length}`);
    console.log(`   - ShoppingList: ${shoppingList.length}`);
    console.log(`   - ShoppingListItem: ${shoppingListItem.length}`);
    console.log(`   - pantry: ${pantry.length}`);
    console.log(`   - pantryItem: ${pantryItem.length}`);
    console.log(`   - Challenges: ${challenges.length}`);
    console.log(`   - Missions: ${missions.length}`);
    const foodCount = await prisma.food.count();
    console.log(`   - foodCategories: ${foodCategories.length}`);
    console.log(`   - userGroups: ${userGroups.length}`);
    console.log(`   - virtualMembers: ${virtualMembers.length}`);
    console.log(`   - knowledge: ${knowledge.length}`);
    console.log(`   - knowledgeProgress: ${knowledgeProgress.length}`);
    console.log(`   - foods (total): ${foodCount}`);
    console.log(`   - TheMealDB recipes: ${themealdbResult.created} created, ${themealdbResult.skipped} skipped`);
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
