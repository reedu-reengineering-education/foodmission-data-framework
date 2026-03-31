#!/usr/bin/env ts-node

/**
 * Development Environment Seeding Script
 *
 * This script seeds the database with comprehensive development data
 * including additional test users, sample foods, and realistic data
 * for development and testing purposes.
 */

import { PrismaClient } from '@prisma/client';
import { DEV_EXTRA_FOODS, DEV_EXTRA_USERS } from '../prisma/seeds/seed-fixtures';
import { upsertDevFood, upsertSeedUser } from '../prisma/seeds/seed-helpers';
import { seedFoods } from '../prisma/seeds/foods';
import { seedUsers } from '../prisma/seeds/users';

const prisma = new PrismaClient();

async function seedDevelopmentData() {
  console.log('🚀 Seeding development environment...');
  console.log('=====================================');

  try {
    await seedFoods(prisma);
    await seedUsers(prisma);

    console.log('🔧 Adding development-specific data...');

    for (const food of DEV_EXTRA_FOODS) {
      await upsertDevFood(prisma, food);
    }

    for (const user of DEV_EXTRA_USERS) {
      await upsertSeedUser(prisma, user);
    }

    console.log('✅ Development seeding completed!');
    console.log('🎯 Development environment is ready for testing');
  } catch (error) {
    console.error('❌ Development seeding failed:', error);
    process.exit(1);
  }
}

async function main() {
  await seedDevelopmentData();
}

main()
  .catch((e) => {
    console.error('Error during development seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
