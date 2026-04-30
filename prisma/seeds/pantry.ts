import { PrismaClient, Pantry } from '@prisma/client';
import { KEYCLOAK_DEV_USER_IDS } from './keycloak-dev-user-ids';
import {
  findUserByKeycloakId,
  warnSeedSkippedMissingUser,
} from './seed-helpers';

export interface PantrySeedData {
  userKeycloakId: string;
  title: string;
}

export const pantryData: PantrySeedData[] = [
  { userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1, title: 'My Kitchen Pantry' },
  { userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser2, title: 'Vegan Pantry' },
  { userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser3, title: 'BBQ Supplies' },
  { userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser4, title: 'Keto Pantry' },
  { userKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1, title: 'Office Kitchen' },
];

export async function seedPantries(prisma: PrismaClient) {
  console.log('🥫 Seeding pantries...');

  const users = await prisma.user.findMany({
    include: { pantry: true },
  });

  let created = 0;
  for (const user of users) {
    if (!user.pantry) {
      await prisma.pantry.create({
        data: {
          userId: user.id,
        },
      });
      created++;
    }
  }

  const totalPantries = await prisma.pantry.count();
  if (created > 0) {
    console.log(`✅ Created ${created} missing pantries`);
  }
  console.log(`📊 Total pantries: ${totalPantries}`);
  
  return await prisma.pantry.findMany();
}
