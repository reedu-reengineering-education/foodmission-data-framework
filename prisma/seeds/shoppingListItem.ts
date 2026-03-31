import { PrismaClient, ShoppingListItem, Unit } from '@prisma/client';
import { KEYCLOAK_DEV_USER_IDS } from './keycloak-dev-user-ids';
import {
  findUserByKeycloakId,
  warnSeedSkippedMissingUser,
} from './seed-helpers';

export interface ShoppingListItemSeedData {
  shoppingListTitle: string;
  userKeycloakId: string;
  foodName: string;
  quantity: number;
  unit: Unit;
  notes?: string;
  checked?: boolean;
}

export const shoppingListItemSeedData: ShoppingListItemSeedData[] = [
  {
    shoppingListTitle: 'Weekly Groceries',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    foodName: 'Bananas',
    quantity: 6,
    unit: Unit.PIECES,
    checked: true,
  },
  {
    shoppingListTitle: 'Weekly Groceries',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    foodName: 'Milk',
    quantity: 1,
    unit: Unit.L,
    notes: 'Organic if available',
    checked: true,
  },
  {
    shoppingListTitle: 'Weekly Groceries',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    foodName: 'Bread',
    quantity: 2,
    unit: Unit.PIECES,
    notes: 'Whole grain',
    checked: true,
  },
  {
    shoppingListTitle: 'Weekly Groceries',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    foodName: 'Eggs',
    quantity: 12,
    unit: Unit.PIECES,
  },
  {
    shoppingListTitle: 'Weekly Groceries',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    foodName: 'Chicken Breast',
    quantity: 500,
    unit: Unit.G,
    checked: true,
  },

  {
    shoppingListTitle: 'Party Snacks',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    foodName: 'Potato Chips',
    quantity: 3,
    unit: Unit.PIECES,
  },
  {
    shoppingListTitle: 'Party Snacks',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    foodName: 'Coca Cola',
    quantity: 2,
    unit: Unit.L,
  },
  {
    shoppingListTitle: 'Party Snacks',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    foodName: 'Pizza',
    quantity: 4,
    unit: Unit.PIECES,
    notes: 'Frozen pizza',
  },
  {
    shoppingListTitle: 'Party Snacks',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    foodName: 'Ice Cream',
    quantity: 1,
    unit: Unit.L,
    notes: 'Vanilla flavor',
  },

  {
    shoppingListTitle: 'Vegan Essentials',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser2,
    foodName: 'Tofu',
    quantity: 2,
    unit: Unit.PIECES,
    notes: 'Extra firm',
  },
  {
    shoppingListTitle: 'Vegan Essentials',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser2,
    foodName: 'Oat Milk',
    quantity: 1,
    unit: Unit.L,
  },
  {
    shoppingListTitle: 'Vegan Essentials',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser2,
    foodName: 'Quinoa',
    quantity: 500,
    unit: Unit.G,
  },
  {
    shoppingListTitle: 'Vegan Essentials',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser2,
    foodName: 'Avocado',
    quantity: 4,
    unit: Unit.PIECES,
    checked: true,
  },
  {
    shoppingListTitle: 'Vegan Essentials',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser2,
    foodName: 'Nutritional Yeast',
    quantity: 1,
    unit: Unit.PIECES,
  },

  {
    shoppingListTitle: 'BBQ Party List',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser3,
    foodName: 'Beef Steaks',
    quantity: 8,
    unit: Unit.PIECES,
    notes: 'Ribeye preferred',
  },
  {
    shoppingListTitle: 'BBQ Party List',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser3,
    foodName: 'Sausages',
    quantity: 12,
    unit: Unit.PIECES,
  },
  {
    shoppingListTitle: 'BBQ Party List',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser3,
    foodName: 'Burger Buns',
    quantity: 8,
    unit: Unit.PIECES,
  },
  {
    shoppingListTitle: 'BBQ Party List',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser3,
    foodName: 'Beer',
    quantity: 24,
    unit: Unit.ML,
    checked: true,
  },
  {
    shoppingListTitle: 'BBQ Party List',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser3,
    foodName: 'BBQ Sauce',
    quantity: 2,
    unit: Unit.CUPS,
  },

  {
    shoppingListTitle: 'Keto Diet Shopping',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser4,
    foodName: 'Salmon',
    quantity: 400,
    unit: Unit.G,
  },
  {
    shoppingListTitle: 'Keto Diet Shopping',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser4,
    foodName: 'Cheese',
    quantity: 200,
    unit: Unit.G,
    notes: 'Aged cheddar',
  },
  {
    shoppingListTitle: 'Keto Diet Shopping',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser4,
    foodName: 'Spinach',
    quantity: 500,
    unit: Unit.G,
    notes: 'Fresh leaves',
  },
  {
    shoppingListTitle: 'Keto Diet Shopping',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser4,
    foodName: 'Olive Oil',
    quantity: 1,
    unit: Unit.CUPS,
    notes: 'Extra virgin',
  },
  {
    shoppingListTitle: 'Keto Diet Shopping',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser4,
    foodName: 'Almonds',
    quantity: 250,
    unit: Unit.G,
  },

  {
    shoppingListTitle: 'Office Supplies',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    foodName: 'Coffee',
    quantity: 2,
    unit: Unit.G,
    notes: 'Medium roast',
  },
  {
    shoppingListTitle: 'Office Supplies',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    foodName: 'Sugar',
    quantity: 1,
    unit: Unit.G,
  },
  {
    shoppingListTitle: 'Office Supplies',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    foodName: 'Tea',
    quantity: 3,
    unit: Unit.G,
    notes: 'Various flavors',
  },
  {
    shoppingListTitle: 'Office Supplies',
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    foodName: 'Cookies',
    quantity: 5,
    unit: Unit.PIECES,
    notes: 'For meetings',
  },
];

export async function seedShoppingListItems(prisma: PrismaClient) {
  console.log('🛍️ Seeding shopping list items...');

  const items: ShoppingListItem[] = [];

  for (const itemData of shoppingListItemSeedData) {
    const user = await findUserByKeycloakId(prisma, itemData.userKeycloakId);

    if (!user) {
      warnSeedSkippedMissingUser(
        itemData.userKeycloakId,
        `item "${itemData.foodName}"`,
      );
      continue;
    }

    const shoppingList = await prisma.shoppingList.findUnique({
      where: {
        userId_title: {
          userId: user.id,
          title: itemData.shoppingListTitle,
        },
      },
    });

    if (!shoppingList) {
      console.warn(
        `⚠️ Shopping list "${itemData.shoppingListTitle}" for user ${itemData.userKeycloakId} not found, skipping item "${itemData.foodName}"`,
      );
      continue;
    }

    let food = await prisma.food.findFirst({
      where: { name: { equals: itemData.foodName, mode: 'insensitive' } },
    });

    if (!food) {
      food = await prisma.food.create({
        data: {
          name: itemData.foodName,
          createdBy: 'system', // or user.id if you prefer
        },
      });
      console.log(`📦 Created missing food: ${itemData.foodName}`);
    }

    const shoppingListItem = await prisma.shoppingListItem.upsert({
      where: {
        shoppingListId_foodId: {
          shoppingListId: shoppingList.id,
          foodId: food.id,
        },
      },
      update: {
        quantity: itemData.quantity,
        unit: itemData.unit,
        notes: itemData.notes,
        checked: itemData.checked || false,
      },
      create: {
        shoppingListId: shoppingList.id,
        foodId: food.id,
        quantity: itemData.quantity,
        unit: itemData.unit,
        notes: itemData.notes,
        checked: itemData.checked || false,
      },
    });

    items.push(shoppingListItem);
  }

  console.log(`✅ Created/updated ${items.length} shopping list items`);
  return items;
}
