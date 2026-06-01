import { PrismaClient, ShoppingList } from '@prisma/client';
import { KEYCLOAK_DEV_USER_IDS } from './keycloak-dev-user-ids';
import {
  findUserByKeycloakId,
  warnSeedSkippedMissingUser,
} from './seed-helpers';

export interface ShoppingListSeedData {
  userKeycloakId: string;
  title: string;
}

export const shoppingListData: ShoppingListSeedData[] = [
  { userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1, title: 'Weekly Groceries' },
  { userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1, title: 'Party Snacks' },
  { userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser2, title: 'Vegan Essentials' },
  { userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser3, title: 'BBQ Party List' },
  { userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser4, title: 'Keto Diet Shopping' },
  { userKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1, title: 'Office Supplies' },
];

export async function seedShoppingLists(prisma: PrismaClient) {
  console.log('🛒 Seeding shopping lists...');

  const lists: ShoppingList[] = [];

  for (const listInfo of shoppingListData) {
    const user = await findUserByKeycloakId(prisma, listInfo.userKeycloakId);

    if (!user) {
      warnSeedSkippedMissingUser(
        listInfo.userKeycloakId,
        `list "${listInfo.title}"`,
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
      update: {},
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
