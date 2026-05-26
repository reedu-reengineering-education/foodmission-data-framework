import { seedFoodKeeper } from '../../../prisma/seeds/foodkeeper';
import {
  createTestPrismaClient,
  runMigrations,
} from './prisma-e2e-helpers';

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

