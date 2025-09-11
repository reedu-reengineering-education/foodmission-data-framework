import { PrismaClient, ShoppingList } from '@prisma/client';

export interface ShoppingListSeedData {
  userKeycloakId: string; // Verknüpfung zu User
  title: string;
}

export const shoppingListData: ShoppingListSeedData[] = [
  {
    userKeycloakId: 'dev-user-1',
    title: 'Weekly Groceries',
  },
  {
    userKeycloakId: 'dev-user-1',
    title: 'Party Snacks',
  },
  {
    userKeycloakId: 'dev-user-2',
    title: 'Vegan Essentials',
  },
  {
    userKeycloakId: 'dev-user-3',
    title: 'BBQ Party List',
  },
  {
    userKeycloakId: 'dev-user-4',
    title: 'Keto Diet Shopping',
  },
  {
    userKeycloakId: 'admin-user-1',
    title: 'Office Supplies',
  },
];

export async function seedShoppingLists(prisma: PrismaClient) {
  console.log('🛒 Seeding shopping lists...');

  const lists: ShoppingList[] = [];

  for (const listInfo of shoppingListData) {
    // User über keycloakId holen
    const user = await prisma.user.findUnique({
      where: { keycloakId: listInfo.userKeycloakId },
    });

    if (!user) {
      console.warn(
        `⚠️ User with keycloakId ${listInfo.userKeycloakId} not found, skipping list "${listInfo.title}"`
      );
      continue;
    }

    const shoppingList = await prisma.shoppingList.upsert({
      where: {
        userId_title: {
          userId: user.id,
          title: listInfo.title,
        },
      },
      update: {}, // nichts ändern außer ggf. später Items hinzufügen
      create: {
        title: listInfo.title,
        userId: user.id,
      },
    });

    lists.push(shoppingList);
  }

  console.log(`✅ Created/updated ${lists.length} shopping lists`);
  return lists;
}
