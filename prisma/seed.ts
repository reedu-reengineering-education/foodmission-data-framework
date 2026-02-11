import { PrismaClient } from '@prisma/client';
import { seedFoods } from './seeds/foods';
import { seedUsers } from './seeds/users';
import { seedShoppingLists } from './seeds/shoppingList';
import { seedShoppingListItems } from './seeds/shoppingListItem';
import { seedPantries } from './seeds/pantry';
import { seedPantryItems } from './seeds/pantryItem';
import { seedFoodCategories } from './seeds/foodCategories';
import { seedUserGroups } from './seeds/userGroups';
import { seedVirtualMembers } from './seeds/virtualMembers';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log('=====================================');

  try {
    const foods = await seedFoods(prisma);

    const users = await seedUsers(prisma);

    const shoppingList = await seedShoppingLists(prisma);

    const shoppingListItem = await seedShoppingListItems(prisma);

    const pantry = await seedPantries(prisma);

    const pantryItem = await seedPantryItems(prisma);
    const foodCategories = await seedFoodCategories(prisma);
    const userGroups = await seedUserGroups(prisma);

    const virtualMembers = await seedVirtualMembers(prisma);

    console.log('=====================================');
    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Foods: ${foods.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - ShoppingList: ${shoppingList.length}`);
    console.log(`   - ShoppingListItem: ${shoppingListItem.length}`);
    console.log(`   - pantry: ${pantry.length}`);
    console.log(`   - pantryItem: ${pantryItem.length}`);
    console.log(`   - foodCategories: ${foodCategories.length}`);
    console.log(`   - userGroups: ${userGroups.length}`);
    console.log(`   - virtualMembers: ${virtualMembers.length}`);
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
