import { PrismaClient, Pantry } from '@prisma/client';

export interface PantrySeedData {
  userKeycloakId: string;
  title: string;
}

export const pantryData: PantrySeedData[] = [
  { userKeycloakId: 'dev-user-1', title: 'My Kitchen Pantry' },
  { userKeycloakId: 'dev-user-2', title: 'Vegan Pantry' },
  { userKeycloakId: 'dev-user-3', title: 'BBQ Supplies' },
  { userKeycloakId: 'dev-user-4', title: 'Keto Pantry' },
  { userKeycloakId: 'admin-user-1', title: 'Office Kitchen' },
];

export async function seedPantries(prisma: PrismaClient) {
  console.log('🥫 Seeding pantries...');

  const pantries: Pantry[] = [];

  for (const pantryInfo of pantryData) {
    const user = await prisma.user.findUnique({
      where: { keycloakId: pantryInfo.userKeycloakId },
    });

    if (!user) {
      console.warn(
        `⚠️  User ${pantryInfo.userKeycloakId} not found, skipping pantry "${pantryInfo.title}"`,
      );
      continue;
    }

    // Check if pantry already exists for this user
    const existingPantry = await prisma.pantry.findUnique({
      where: { userId: user.id },
    });

    if (existingPantry) {
      console.log(
        `ℹ️  Pantry already exists for user ${pantryInfo.userKeycloakId}, updating...`,
      );
      const updatedPantry = await prisma.pantry.update({
        where: { userId: user.id },
        data: {
          title: pantryInfo.title,
        },
      });
      pantries.push(updatedPantry);
    } else {
      const pantry = await prisma.pantry.create({
        data: {
          title: pantryInfo.title,
          userId: user.id,
        },
      });
      pantries.push(pantry);
    }
  }

  console.log(`✅ Created/updated ${pantries.length} pantries`);
  return pantries;
}
