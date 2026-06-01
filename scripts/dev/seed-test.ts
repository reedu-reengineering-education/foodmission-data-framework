#!/usr/bin/env ts-node

/**
 * Test Environment Seeding Script
 *
 * This script seeds the database with minimal, predictable data
 * specifically designed for automated testing. Data is consistent
 * and deterministic to ensure reliable test execution.
 */

import { PrismaClient } from '@prisma/client';
import {
  TEST_SEED_FOOD_PRODUCTS,
  TEST_SEED_USERS,
} from '../seeds/dev/seed-fixtures';
import {
  upsertSeedFoodByBarcode,
  upsertSeedUser,
} from '../seeds/dev/seed-helpers';

const prisma = new PrismaClient();

async function seedTestData() {
  console.log('🧪 Seeding test environment...');
  console.log('=====================================');

  try {
    for (const foodProduct of TEST_SEED_FOOD_PRODUCTS) {
      await upsertSeedFoodByBarcode(prisma, foodProduct, 'test-seed');
    }

    for (const user of TEST_SEED_USERS) {
      await upsertSeedUser(prisma, user);
    }

    console.log('✅ Test seeding completed!');
    console.log('🧪 Test environment is ready for automated testing');
  } catch (error) {
    console.error('❌ Test seeding failed:', error);
    process.exit(1);
  }
}

async function main() {
  await seedTestData();
}

main()
  .catch((e) => {
    console.error('Error during test seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
