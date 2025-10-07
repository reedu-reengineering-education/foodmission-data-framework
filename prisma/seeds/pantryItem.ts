import { PrismaClient, PantryItem } from '@prisma/client';

export interface PantryItemSeedData {
  userKeycloakId: string;
  foodName: string;
  quantity: number;
  unit: string;
  notes?: string;
  expiryDate?: Date;
}

export const pantryItemData: PantryItemSeedData[] = [
  // Dev User 1 - My Kitchen Pantry
  {
    userKeycloakId: 'dev-user-1',
    foodName: 'Tomatoes',
    quantity: 5,
    unit: 'kg',
    notes: 'Fresh from farmers market',
    expiryDate: new Date('2025-10-15'),
  },
  {
    userKeycloakId: 'dev-user-1',
    foodName: 'Pasta',
    quantity: 3,
    unit: 'packages',
    notes: 'Whole wheat',
  },
  {
    userKeycloakId: 'dev-user-1',
    foodName: 'Olive Oil',
    quantity: 1,
    unit: 'liter',
    expiryDate: new Date('2026-03-20'),
  },

  // Dev User 2 - Vegan Pantry
  {
    userKeycloakId: 'dev-user-2',
    foodName: 'Chickpeas',
    quantity: 4,
    unit: 'cans',
    notes: 'Organic',
  },
  {
    userKeycloakId: 'dev-user-2',
    foodName: 'Almond Milk',
    quantity: 2,
    unit: 'liters',
    expiryDate: new Date('2025-10-08'),
  },
  {
    userKeycloakId: 'dev-user-2',
    foodName: 'Quinoa',
    quantity: 1.5,
    unit: 'kg',
    notes: 'Red quinoa',
  },

  // Dev User 3 - BBQ Supplies
  {
    userKeycloakId: 'dev-user-3',
    foodName: 'BBQ Sauce',
    quantity: 3,
    unit: 'bottles',
    notes: 'Spicy variant',
    expiryDate: new Date('2026-01-15'),
  },
  {
    userKeycloakId: 'dev-user-3',
    foodName: 'Charcoal',
    quantity: 10,
    unit: 'kg',
  },

  // Dev User 4 - Keto Pantry
  {
    userKeycloakId: 'dev-user-4',
    foodName: 'Coconut Oil',
    quantity: 2,
    unit: 'jars',
    notes: 'Virgin coconut oil',
  },
  {
    userKeycloakId: 'dev-user-4',
    foodName: 'Almonds',
    quantity: 0.5,
    unit: 'kg',
    notes: 'Raw, unsalted',
    expiryDate: new Date('2025-12-01'),
  },
  {
    userKeycloakId: 'dev-user-4',
    foodName: 'Cheese',
    quantity: 0.8,
    unit: 'kg',
    notes: 'Cheddar',
    expiryDate: new Date('2025-10-20'),
  },

  // Admin User 1 - Office Kitchen
  {
    userKeycloakId: 'admin-user-1',
    foodName: 'Coffee',
    quantity: 2,
    unit: 'kg',
    notes: 'Arabica beans',
  },
  {
    userKeycloakId: 'admin-user-1',
    foodName: 'Sugar',
    quantity: 1,
    unit: 'kg',
  },
  {
    userKeycloakId: 'admin-user-1',
    foodName: 'Tea Bags',
    quantity: 100,
    unit: 'pieces',
    notes: 'Black tea',
  },
];

export async function seedPantryItems(prisma: PrismaClient) {
  console.log('📦 Seeding pantry items...');

  const items: PantryItem[] = [];
  let skippedCount = 0;

  for (const itemInfo of pantryItemData) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { keycloakId: itemInfo.userKeycloakId },
    });

    if (!user) {
      console.warn(
        `⚠️  User ${itemInfo.userKeycloakId} not found, skipping item "${itemInfo.foodName}"`,
      );
      skippedCount++;
      continue;
    }

    // Find or create pantry for user
    let pantry = await prisma.pantry.findUnique({
      where: { userId: user.id },
    });

    if (!pantry) {
      console.log(
        `ℹ️  No pantry found for user ${itemInfo.userKeycloakId}, creating one...`,
      );
      pantry = await prisma.pantry.create({
        data: {
          title: 'My Pantry',
          userId: user.id,
        },
      });
    }

    // Find food by name
    const food = await prisma.food.findFirst({
      where: { name: itemInfo.foodName },
    });

    if (!food) {
      console.warn(
        `⚠️  Food "${itemInfo.foodName}" not found, skipping pantry item`,
      );
      skippedCount++;
      continue;
    }

    // Check if item already exists
    const existingItem = await prisma.pantryItem.findFirst({
      where: {
        pantryId: pantry.id,
        foodId: food.id,
      },
    });

    if (existingItem) {
      console.log(
        `ℹ️  Item "${itemInfo.foodName}" already exists in pantry for user ${itemInfo.userKeycloakId}, updating...`,
      );
      const updatedItem = await prisma.pantryItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: itemInfo.quantity,
          unit: itemInfo.unit,
          notes: itemInfo.notes,
          expiryDate: itemInfo.expiryDate,
        },
      });
      items.push(updatedItem);
    } else {
      const pantryItem = await prisma.pantryItem.create({
        data: {
          pantryId: pantry.id,
          foodId: food.id,
          quantity: itemInfo.quantity,
          unit: itemInfo.unit,
          notes: itemInfo.notes,
          expiryDate: itemInfo.expiryDate,
        },
      });
      items.push(pantryItem);
    }
  }

  console.log(`✅ Created/updated ${items.length} pantry items`);
  if (skippedCount > 0) {
    console.log(
      `⚠️  Skipped ${skippedCount} items due to missing dependencies`,
    );
  }
  return items;
}
