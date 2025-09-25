import { PrismaClient, ShoppingListItem } from '@prisma/client';

export interface ShoppingListItemSeedData {
  shoppingListTitle: string;
  userKeycloakId: string;
  foodName: string;
  quantity: number;
  unit: string;
  notes?: string;
  checked?: boolean;
}

export const shoppingListItemSeedData: ShoppingListItemSeedData[] = [
  {
    shoppingListTitle: 'Weekly Groceries',
    userKeycloakId: 'dev-user-1',
    foodName: 'Bananas',
    quantity: 6,
    unit: 'pieces',
  },
  {
    shoppingListTitle: 'Weekly Groceries',
    userKeycloakId: 'dev-user-1',
    foodName: 'Milk',
    quantity: 1,
    unit: 'liter',
    notes: 'Organic if available',
  },
  {
    shoppingListTitle: 'Weekly Groceries',
    userKeycloakId: 'dev-user-1',
    foodName: 'Bread',
    quantity: 2,
    unit: 'pieces',
    notes: 'Whole grain',
  },
  {
    shoppingListTitle: 'Weekly Groceries',
    userKeycloakId: 'dev-user-1',
    foodName: 'Eggs',
    quantity: 12,
    unit: 'pieces',
  },
  {
    shoppingListTitle: 'Weekly Groceries',
    userKeycloakId: 'dev-user-1',
    foodName: 'Chicken Breast',
    quantity: 500,
    unit: 'grams',
    checked: true,
  },

  {
    shoppingListTitle: 'Party Snacks',
    userKeycloakId: 'dev-user-1',
    foodName: 'Potato Chips',
    quantity: 3,
    unit: 'packages',
  },
  {
    shoppingListTitle: 'Party Snacks',
    userKeycloakId: 'dev-user-1',
    foodName: 'Coca Cola',
    quantity: 2,
    unit: 'liter',
  },
  {
    shoppingListTitle: 'Party Snacks',
    userKeycloakId: 'dev-user-1',
    foodName: 'Pizza',
    quantity: 4,
    unit: 'pieces',
    notes: 'Frozen pizza',
  },
  {
    shoppingListTitle: 'Party Snacks',
    userKeycloakId: 'dev-user-1',
    foodName: 'Ice Cream',
    quantity: 1,
    unit: 'liter',
    notes: 'Vanilla flavor',
  },

  {
    shoppingListTitle: 'Vegan Essentials',
    userKeycloakId: 'dev-user-2',
    foodName: 'Tofu',
    quantity: 2,
    unit: 'packages',
    notes: 'Extra firm',
  },
  {
    shoppingListTitle: 'Vegan Essentials',
    userKeycloakId: 'dev-user-2',
    foodName: 'Oat Milk',
    quantity: 1,
    unit: 'liter',
  },
  {
    shoppingListTitle: 'Vegan Essentials',
    userKeycloakId: 'dev-user-2',
    foodName: 'Quinoa',
    quantity: 500,
    unit: 'grams',
  },
  {
    shoppingListTitle: 'Vegan Essentials',
    userKeycloakId: 'dev-user-2',
    foodName: 'Avocado',
    quantity: 4,
    unit: 'pieces',
    checked: true,
  },
  {
    shoppingListTitle: 'Vegan Essentials',
    userKeycloakId: 'dev-user-2',
    foodName: 'Nutritional Yeast',
    quantity: 1,
    unit: 'package',
  },

  {
    shoppingListTitle: 'BBQ Party List',
    userKeycloakId: 'dev-user-3',
    foodName: 'Beef Steaks',
    quantity: 8,
    unit: 'pieces',
    notes: 'Ribeye preferred',
  },
  {
    shoppingListTitle: 'BBQ Party List',
    userKeycloakId: 'dev-user-3',
    foodName: 'Sausages',
    quantity: 12,
    unit: 'pieces',
  },
  {
    shoppingListTitle: 'BBQ Party List',
    userKeycloakId: 'dev-user-3',
    foodName: 'Burger Buns',
    quantity: 8,
    unit: 'pieces',
  },
  {
    shoppingListTitle: 'BBQ Party List',
    userKeycloakId: 'dev-user-3',
    foodName: 'Beer',
    quantity: 24,
    unit: 'cans',
    checked: true,
  },
  {
    shoppingListTitle: 'BBQ Party List',
    userKeycloakId: 'dev-user-3',
    foodName: 'BBQ Sauce',
    quantity: 2,
    unit: 'bottles',
  },

  {
    shoppingListTitle: 'Keto Diet Shopping',
    userKeycloakId: 'dev-user-4',
    foodName: 'Salmon',
    quantity: 400,
    unit: 'grams',
  },
  {
    shoppingListTitle: 'Keto Diet Shopping',
    userKeycloakId: 'dev-user-4',
    foodName: 'Cheese',
    quantity: 200,
    unit: 'grams',
    notes: 'Aged cheddar',
  },
  {
    shoppingListTitle: 'Keto Diet Shopping',
    userKeycloakId: 'dev-user-4',
    foodName: 'Spinach',
    quantity: 500,
    unit: 'grams',
    notes: 'Fresh leaves',
  },
  {
    shoppingListTitle: 'Keto Diet Shopping',
    userKeycloakId: 'dev-user-4',
    foodName: 'Olive Oil',
    quantity: 1,
    unit: 'bottle',
    notes: 'Extra virgin',
  },
  {
    shoppingListTitle: 'Keto Diet Shopping',
    userKeycloakId: 'dev-user-4',
    foodName: 'Almonds',
    quantity: 250,
    unit: 'grams',
  },

  {
    shoppingListTitle: 'Office Supplies',
    userKeycloakId: 'admin-user-1',
    foodName: 'Coffee',
    quantity: 2,
    unit: 'packages',
    notes: 'Medium roast',
  },
  {
    shoppingListTitle: 'Office Supplies',
    userKeycloakId: 'admin-user-1',
    foodName: 'Sugar',
    quantity: 1,
    unit: 'package',
  },
  {
    shoppingListTitle: 'Office Supplies',
    userKeycloakId: 'admin-user-1',
    foodName: 'Tea',
    quantity: 3,
    unit: 'boxes',
    notes: 'Various flavors',
  },
  {
    shoppingListTitle: 'Office Supplies',
    userKeycloakId: 'admin-user-1',
    foodName: 'Cookies',
    quantity: 5,
    unit: 'packages',
    notes: 'For meetings',
  },
];

export async function seedShoppingListItems(prisma: PrismaClient) {
  console.log('🛍️ Seeding shopping list items...');

  const items: ShoppingListItem[] = [];

  for (const itemData of shoppingListItemSeedData) {
    const user = await prisma.user.findUnique({
      where: { keycloakId: itemData.userKeycloakId },
    });

    if (!user) {
      console.warn(
        `⚠️ User ${itemData.userKeycloakId} not found, skipping item "${itemData.foodName}"`,
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
