#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { seedOpenFoodFactsFromJson } from '../prisma/seeds/openfoodfacts';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding food_products only from OpenFoodFacts JSON...');
  console.log('=====================================');

  try {
    console.log('🗑️  Clearing existing food_products rows...');
    await prisma.foodProduct.deleteMany({});
    console.log('✅ Existing food_products cleared');

    await seedOpenFoodFactsFromJson(prisma);

    console.log('=====================================');
    console.log('✅ Food product seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during food product seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
