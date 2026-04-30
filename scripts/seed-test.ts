#!/usr/bin/env ts-node

/**
 * Test Environment Seeding Script
 *
 * This script seeds the database with minimal, predictable data
 * specifically designed for automated testing. Data is consistent
 * and deterministic to ensure reliable test execution.
 */

import { PrismaClient } from '@prisma/client';
import { TEST_SEED_FOODS, TEST_SEED_USERS } from '../prisma/seeds/seed-fixtures';
import {
  upsertSeedFoodByBarcode,
  upsertSeedUser,
} from '../prisma/seeds/seed-helpers';

const prisma = new PrismaClient();

async function seedTestData() {
  console.log('🧪 Seeding test environment...');
  console.log('=====================================');

  try {
    for (const food of TEST_SEED_FOODS) {
      await upsertSeedFoodByBarcode(prisma, food, 'test-seed');
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
