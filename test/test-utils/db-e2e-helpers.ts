import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { seedFoodKeeper } from '../../prisma/seeds/foodkeeper';

export const TEST_DB_URL =
  process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

export function createTestPrismaClient(): PrismaClient {
  if (!TEST_DB_URL) {
    throw new Error(
      'No test database URL configured. Set DATABASE_URL or TEST_DATABASE_URL.',
    );
  }
  return new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
  });
}

export function runMigrations(): boolean {
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

export interface TestFixtures {
  userId: string;
  pantryId: string;
  foodId: string;
  shoppingListId?: string;
}

export async function createTestFixtures(
  prisma: PrismaClient,
  keycloakId: string,
  options: { withShoppingList?: boolean } = {},
): Promise<TestFixtures> {
  const user = await prisma.user.create({
    data: {
      keycloakId,
      email: `${keycloakId}@test.com`,
      firstName: 'Test',
      lastName: 'User',
    },
  });

  const pantry = await prisma.pantry.create({ data: { userId: user.id } });

  const food = await prisma.food.create({
    data: { name: 'Milk', createdBy: 'test' },
  });

  const fixtures: TestFixtures = {
    userId: user.id,
    pantryId: pantry.id,
    foodId: food.id,
  };

  if (options.withShoppingList) {
    const shoppingList = await prisma.shoppingList.create({
      data: { title: 'Test List', userId: user.id },
    });
    fixtures.shoppingListId = shoppingList.id;
  }

  return fixtures;
}

export async function cleanupTestFixtures(
  prisma: PrismaClient,
  fixtures: TestFixtures,
): Promise<void> {
  if (fixtures.shoppingListId) {
    await prisma.shoppingListItem.deleteMany({
      where: { shoppingListId: fixtures.shoppingListId },
    });
    await prisma.shoppingList.delete({
      where: { id: fixtures.shoppingListId },
    });
  }
  await prisma.pantryItem.deleteMany({
    where: { pantryId: fixtures.pantryId },
  });
  await prisma.pantry.delete({ where: { id: fixtures.pantryId } });
  await prisma.food.delete({ where: { id: fixtures.foodId } });
  await prisma.user.delete({ where: { id: fixtures.userId } });
}

export async function setupDbSuite(prisma: PrismaClient): Promise<boolean> {
  if (!runMigrations()) return false;
  await seedFoodKeeper(prisma);
  return true;
}
