#!/usr/bin/env ts-node

/**
 * Development Environment Seeding Script
 * 
 * This script seeds the database with comprehensive development data
 * including additional test users, sample foods, and realistic data
 * for development and testing purposes.
 */

import { PrismaClient } from '@prisma/client';
import { seedCategories } from '../prisma/seeds/categories';
import { seedFoods } from '../prisma/seeds/foods';
import { seedUsers } from '../prisma/seeds/users';

const prisma = new PrismaClient();

async function seedDevelopmentData() {
  console.log('🚀 Seeding development environment...');
  console.log('=====================================');

  try {
    // Run standard seeding
    await seedCategories(prisma);
    await seedFoods(prisma);
    await seedUsers(prisma);
    
    // Add additional development-specific data
    console.log('🔧 Adding development-specific data...');
    
    // Add more test foods with various states
    const devFoods = [
      {
        name: 'Test Food - No Barcode',
        description: 'Test food item without barcode for testing',
        categoryName: 'Snacks',
      },
      {
        name: 'Test Food - With OpenFoodFacts',
        description: 'Test food with OpenFoodFacts integration',
        categoryName: 'Beverages',
        barcode: '9999999999999',
        openFoodFactsId: 'test-off-id-123',
      },
      {
        name: 'Test Food - Long Description',
        description: 'This is a test food item with a very long description that should test how the system handles longer text content and ensure proper validation and display of extended descriptions in the user interface.',
        categoryName: 'Condiments',
        barcode: '8888888888888',
      },
    ];
    
    const categories = await prisma.foodCategory.findMany();
    const categoryMap = new Map(categories.map(cat => [cat.name, cat.id]));
    
    for (const foodInfo of devFoods) {
      const categoryId = categoryMap.get(foodInfo.categoryName);
      if (categoryId) {
        await prisma.food.upsert({
          where: { 
            barcode: foodInfo.barcode || `dev-${foodInfo.name.toLowerCase().replace(/\s+/g, '-')}` 
          },
          update: {
            name: foodInfo.name,
            description: foodInfo.description,
            categoryId,
          },
          create: {
            name: foodInfo.name,
            description: foodInfo.description,
            categoryId,
            barcode: foodInfo.barcode,
            openFoodFactsId: (foodInfo as any).openFoodFactsId,
            createdBy: 'dev-seed',
          },
        });
      }
    }
    
    // Add test users with edge cases
    const devUsers = [
      {
        keycloakId: 'test-user-no-prefs',
        email: 'test.noprofs@example.com',
        firstName: 'Test',
        lastName: 'NoPreferences',
      },
      {
        keycloakId: 'test-user-many-allergies',
        email: 'test.allergies@example.com',
        firstName: 'Test',
        lastName: 'ManyAllergies',
        preferences: {
          dietaryRestrictions: ['vegetarian', 'gluten-free', 'low-sodium'],
          allergies: ['nuts', 'dairy', 'eggs', 'soy', 'shellfish'],
          preferredCategories: ['Fruits', 'Vegetables'],
        },
      },
    ];
    
    for (const userInfo of devUsers) {
      const user = await prisma.user.upsert({
        where: { keycloakId: userInfo.keycloakId },
        update: {
          email: userInfo.email,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
        },
        create: {
          keycloakId: userInfo.keycloakId,
          email: userInfo.email,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
        },
      });
      
      if ((userInfo as any).preferences) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            preferences: (userInfo as any).preferences,
          },
        });
      }
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