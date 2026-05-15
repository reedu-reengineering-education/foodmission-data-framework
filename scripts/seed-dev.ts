#!/usr/bin/env ts-node

/**
 * Development Environment Seeding Script
 *
 * This script seeds the database with comprehensive development data
 * including additional test users, sample food products, and realistic data
 * for development and testing purposes.
 */

import { PrismaClient } from '@prisma/client';
import {
  DEV_EXTRA_FOOD_PRODUCTS,
  DEV_EXTRA_USERS,
} from '../prisma/seeds/seed-fixtures';
import { upsertDevFood, upsertSeedUser } from '../prisma/seeds/seed-helpers';
import { seedOpenFoodFactsFromJson } from '../prisma/seeds/openfoodfacts';
import { seedUsers } from '../prisma/seeds/users';

const prisma = new PrismaClient();

async function seedDevelopmentData() {
  console.log('🚀 Seeding development environment...');
  console.log('=====================================');

  try {
    await seedOpenFoodFactsFromJson(prisma);
    await seedUsers(prisma);

    console.log('🔧 Adding development-specific data...');

    for (const foodProduct of DEV_EXTRA_FOOD_PRODUCTS) {
      await upsertDevFood(prisma, foodProduct);
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
