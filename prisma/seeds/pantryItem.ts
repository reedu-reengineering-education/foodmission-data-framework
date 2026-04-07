import { PrismaClient, PantryItem, Unit } from '@prisma/client';
import { KEYCLOAK_DEV_USER_IDS } from './keycloak-dev-user-ids';
import {
  findUserByKeycloakId,
  warnSeedSkippedMissingUser,
} from './seed-helpers';
import { randomInt } from 'crypto';

export interface PantryItemSeedData {
  userKeycloakId: string;
  foodName: string;
  quantity: number;
  unit: Unit;
  notes?: string;
  expiryDate?: Date;
  expiryDateSource?: 'manual' | 'auto_foodkeeper';
}

const getExpiryDate = () => {
  const daysFromNow = randomInt(0, 14);

  return new Date(Date.now() + 1000 * 60 * 60 * 24 * daysFromNow);
};

export const pantryItemData: PantryItemSeedData[] = [
  // Dev User 1 - My Kitchen Pantry
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    foodName: 'Tomatoes',
    quantity: 5,
    unit: Unit.KG,
    notes: 'Fresh from farmers market',
    expiryDate: getExpiryDate(),
  },
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    foodName: 'Pasta',
    quantity: 300,
    unit: Unit.G,
    notes: 'Whole wheat',
    expiryDate: getExpiryDate(),
  },
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    foodName: 'Olive Oil',
    quantity: 1,
    unit: Unit.L,
    expiryDate: getExpiryDate(),
  },

  // Dev User 2 - Vegan Pantry
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser2,
    foodName: 'Chickpeas in Cans',
    quantity: 4,
    unit: Unit.PIECES,
    notes: 'Organic',
    expiryDate: getExpiryDate(),
  },
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser2,
    foodName: 'Almond Milk',
    quantity: 2,
    unit: Unit.L,
    expiryDate: getExpiryDate(),
  },
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser2,
    foodName: 'Quinoa',
    quantity: 1.5,
    unit: Unit.KG,
    notes: 'Red quinoa',
    expiryDate: getExpiryDate(),
  },

  // Dev User 3 - BBQ Supplies
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser3,
    foodName: 'BBQ Sauce',
    quantity: 300,
    unit: Unit.ML,
    notes: 'Spicy variant',
    expiryDate: getExpiryDate(),
  },
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser3,
    foodName: 'Charcoal',
    quantity: 10,
    unit: Unit.KG,
    expiryDate: getExpiryDate(),
  },

  // Dev User 4 - Keto Pantry
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser4,
    foodName: 'Coconut Oil',
    quantity: 2,
    unit: Unit.ML,
    notes: 'Virgin coconut oil',
    expiryDate: getExpiryDate(),
  },
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser4,
    foodName: 'Almonds',
    quantity: 0.5,
    unit: Unit.KG,
    notes: 'Raw, unsalted',
    expiryDate: getExpiryDate(),
  },
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser4,
    foodName: 'Cheese',
    quantity: 0.8,
    unit: Unit.KG,
    notes: 'Cheddar',
    expiryDate: getExpiryDate(),
  },

  // Admin User 1 - Office Kitchen
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    foodName: 'Coffee',
    quantity: 2,
    unit: Unit.KG,
    notes: 'Arabica beans',
    expiryDate: getExpiryDate(),
  },
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    foodName: 'Sugar',
    quantity: 1,
    unit: Unit.KG,
    expiryDate: getExpiryDate(),
  },
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    foodName: 'Tea Bags',
    quantity: 100,
    unit: Unit.PIECES,
    notes: 'Black tea',
    expiryDate: getExpiryDate(),
  },
];

export async function seedPantryItems(prisma: PrismaClient) {
  console.log('📦 Seeding pantry items...');

  const items: PantryItem[] = [];
  let skippedCount = 0;

  for (const itemInfo of pantryItemData) {
    const user = await findUserByKeycloakId(prisma, itemInfo.userKeycloakId);

    if (!user) {
      warnSeedSkippedMissingUser(
        itemInfo.userKeycloakId,
        `item "${itemInfo.foodName}"`,
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
          expiryDateSource: itemInfo.expiryDateSource,
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
          expiryDateSource: itemInfo.expiryDateSource,
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
