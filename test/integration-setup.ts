/**
 * Integration test setup
 * This file is executed before integration tests
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let prisma: PrismaClient;

beforeAll(async () => {
  // Initialize test database
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/foodmission_test_db',
      },
    },
  });

  // Reset database schema
  try {
    execSync('npx prisma migrate reset --force --skip-seed', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: 'inherit',
    });
  } catch (error) {
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
  } catch (error) {
    console.warn('Test seeding failed, continuing without seed data');
  }
});

beforeEach(async () => {
  // Clean up data between tests but keep schema and seed data
  await prisma.userPreferences.deleteMany();
  await prisma.user.deleteMany();
  await prisma.food.deleteMany();
  await prisma.foodCategory.deleteMany();
  
  // Re-seed basic test data
  await seedBasicTestData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function seedBasicTestData() {
  // Create test categories
  const testCategory = await prisma.foodCategory.create({
    data: {
      name: 'Test-Category',
      description: 'Test category for integration tests',
    },
  });

  // Create test food
  await prisma.food.create({
    data: {
      name: 'Test Food',
      description: 'Test food for integration tests',
      barcode: 'TEST123456',
      categoryId: testCategory.id,
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

  // Create test user preferences
  await prisma.userPreferences.create({
    data: {
      userId: testUser.id,
      dietaryRestrictions: ['vegetarian'],
      allergies: ['nuts'],
      preferredCategories: ['Test-Category'],
    },
  });
}

// Export prisma instance for use in integration tests
global.testPrisma = prisma;

declare global {
  var testPrisma: PrismaClient;
}