#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { seedOpenFoodFactsFromJson } from '../prisma/seeds/openfoodfacts';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding foods only from OpenFoodFacts...');
  console.log('=====================================');

  try {
    // Clear existing foods
    console.log('🗑️  Clearing existing food data...');
    await prisma.foodProduct.deleteMany({});
    console.log('✅ Existing food data cleared');

    // Seed new foods from OpenFoodFacts
    await seedOpenFoodFactsFromJson(prisma);

    console.log('=====================================');
    console.log('✅ Food seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during food seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
