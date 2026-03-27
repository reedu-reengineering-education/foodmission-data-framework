import { PrismaClient } from '@prisma/client';
import { seedFoodCategories } from './seeds/foodCategories';
import { seedOpenFoodFactsFromJson } from './seeds/openfoodfacts';
import { seedUsers } from './seeds/users';
import { seedShoppingLists } from './seeds/shoppingList';
import { seedShoppingListItems } from './seeds/shoppingListItem';
import { seedPantries } from './seeds/pantry';
import { seedPantryItems } from './seeds/pantryItem';
import { seedUserGroups } from './seeds/userGroups';
import { seedVirtualMembers } from './seeds/groupMembers';
import { seedKnowledge, seedUserKnowledgeProgress } from './seeds/knowledge';
import { seedChallenges } from './seeds/challenges';
import { seedMissions } from './seeds/missions';
import { seedRecipes } from './seeds/themealdb';
import { seedMeals } from './seeds/meals';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log('=====================================');

  try {
    const offResult = await seedOpenFoodFactsFromJson(prisma);
    if (offResult.skipped) {
      console.log(
        '   ⏭️  OFF JSON not found; Food table will have no OFF products. Run npx ts-node scripts/pull-openfoodfacts-foods.ts to generate it.',
      );
    }

    const foodCategories = await seedFoodCategories(prisma);
    const users = await seedUsers(prisma);
    const shoppingList = await seedShoppingLists(prisma);
    const shoppingListItem = await seedShoppingListItems(prisma);
    const pantry = await seedPantries(prisma);
    const pantryItem = await seedPantryItems(prisma);
    const userGroups = await seedUserGroups(prisma);
    const virtualMembers = await seedVirtualMembers(prisma);
    const knowledge = await seedKnowledge(prisma);
    const knowledgeProgress = await seedUserKnowledgeProgress(prisma);
    const challenges = await seedChallenges(prisma);
    const missions = await seedMissions(prisma);
    const recipes = await seedRecipes(prisma);
    const meals = await seedMeals(prisma);
    const foodCount = await prisma.food.count();

    console.log('=====================================');
    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Summary:');
    const summaryRows: { label: string; value: string | number }[] = [
      { label: 'users', value: users.length },
      { label: 'foodCategories', value: foodCategories.length },
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
      { label: 'foods (total)', value: foodCount },
      {
        label: 'recipes',
        value: `${recipes.created} created, ${recipes.skipped} skipped`,
      },
      { label: 'meals (linked to recipes)', value: meals.length },
    ];
    for (const row of summaryRows) {
      console.log(`   - ${row.label}: ${row.value}`);
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
