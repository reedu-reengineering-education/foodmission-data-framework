import { createTestPrismaClient, runMigrations } from './test-utils/db-e2e-helpers';
import { seedFoodKeeper } from '../prisma/seeds/foodkeeper';

export default async function globalE2eSetup(): Promise<void> {
  if (!runMigrations()) {
    throw new Error('Failed to run Prisma migrations for e2e tests.');
  }

  const prisma = createTestPrismaClient();
  try {
    await seedFoodKeeper(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
