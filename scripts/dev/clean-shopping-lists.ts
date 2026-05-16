import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanShoppingLists() {
  console.log('Starting cleanup...\n');

  const listCount = await prisma.shoppingList.count();
  const itemCount = await prisma.shoppingListItem.count();

  console.log('Current data:');
  console.log(`  Shopping lists: ${listCount}`);
  console.log(`  Shopping list items: ${itemCount}\n`);

  if (listCount === 0) {
    console.log('✓ No data to clean');
    return;
  }

  // Items cascade-delete with their list, but delete items first to be explicit
  console.log('Deleting shopping list items...');
  const deletedItems = await prisma.shoppingListItem.deleteMany({});
  console.log(`✓ Deleted ${deletedItems.count} items`);

  console.log('Deleting shopping lists...');
  const deletedLists = await prisma.shoppingList.deleteMany({});
  console.log(`✓ Deleted ${deletedLists.count} shopping lists`);

  console.log('\n✅ Cleanup completed!');
}

cleanShoppingLists()
  .catch((e) => {
    console.error('\n❌ Cleanup failed:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
