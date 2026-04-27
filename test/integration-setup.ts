/**
 * Integration test setup
 * This file is executed before integration tests
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

/** Narrows client after `prisma generate` (FoodProduct → `food_products`). */
type PrismaWithFoodProduct = PrismaClient & {
  foodProduct: {
    deleteMany: (args?: object) => Promise<{ count: number }>;
    create: (args: {
      data: {
        name: string;
        description?: string | null;
        barcode?: string | null;
        createdBy: string;
      };
    }) => Promise<{ id: string }>;
  };
};

function foodProducts(
  prismaClient: PrismaClient,
): PrismaWithFoodProduct['foodProduct'] {
  return (prismaClient as PrismaWithFoodProduct).foodProduct;
}

let prisma: PrismaClient | undefined;

beforeAll(() => {
  // Initialize test database
  prisma = new PrismaClient({
    datasources: {
      db: {
        url:
          process.env.TEST_DATABASE_URL ||
          'postgresql://postgres:password@localhost:5432/foodmission_test_db',
      },
    },
  });

  // Reset database schema
  try {
    execSync('npx prisma migrate reset --force --skip-seed', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: 'inherit',
    });
  } catch {
    console.warn('Database reset failed, continuing with existing schema');
  }

  // Run migrations
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Migration failed:', error);
  }

  // Seed test data
  try {
    execSync('npm run db:seed:test', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: 'inherit',
    });
  } catch {
    console.warn('Test seeding failed, continuing without seed data');
  }
});

beforeEach(async () => {
  if (!prisma) return;

  // Clean up data between tests but keep schema and seed data
  await prisma.user.deleteMany();
  await foodProducts(prisma).deleteMany();

  // Re-seed basic test data
  await seedBasicTestData();
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});

async function seedBasicTestData() {
  if (!prisma) return;

  // Create test food product
  await foodProducts(prisma).create({
    data: {
      name: 'Test Food',
      description: 'Test food for integration tests',
      barcode: 'TEST123456',
      createdBy: 'test-user',
    },
  });

  // Create test user
  const testUser = await prisma.user.create({
    data: {
      keycloakId: 'test-keycloak-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    },
  });

  // Update test user with preferences
  await prisma.user.update({
    where: { id: testUser.id },
    data: {
      preferences: {
        dietaryRestrictions: ['vegetarian'],
        allergies: ['nuts'],
      },
    },
  });
}

// Export prisma instance for use in integration tests
if (prisma) {
  global.testPrisma = prisma;
}

declare global {
  var testPrisma: PrismaClient;
}
