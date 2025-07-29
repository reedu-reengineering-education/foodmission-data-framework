#!/usr/bin/env ts-node

/**
 * Test Environment Seeding Script
 * 
 * This script seeds the database with minimal, predictable data
 * specifically designed for automated testing. Data is consistent
 * and deterministic to ensure reliable test execution.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestData() {
  console.log('🧪 Seeding test environment...');
  console.log('=====================================');

  try {
    // Create minimal, predictable categories for testing
    const testCategories = [
      { name: 'Test-Fruits', description: 'Test fruits category' },
      { name: 'Test-Vegetables', description: 'Test vegetables category' },
      { name: 'Test-Proteins', description: 'Test proteins category' },
    ];
    
    const categories: Array<{ id: string; name: string; description: string | null; createdAt: Date }> = [];
    for (const cat of testCategories) {
      const category = await prisma.foodCategory.upsert({
        where: { name: cat.name },
        update: cat,
        create: cat,
      });
      categories.push(category);
    }
    
    // Create minimal, predictable foods for testing
    const testFoods = [
      {
        name: 'Test Apple',
        description: 'Test apple for automated testing',
        categoryName: 'Test-Fruits',
        barcode: 'TEST001',
      },
      {
        name: 'Test Carrot',
        description: 'Test carrot for automated testing',
        categoryName: 'Test-Vegetables',
        barcode: 'TEST002',
      },
      {
        name: 'Test Chicken',
        description: 'Test chicken for automated testing',
        categoryName: 'Test-Proteins',
        barcode: 'TEST003',
      },
    ];
    
    const categoryMap = new Map(categories.map(cat => [cat.name, cat.id]));
    
    for (const foodInfo of testFoods) {
      const categoryId = categoryMap.get(foodInfo.categoryName);
      if (categoryId) {
        await prisma.food.upsert({
          where: { barcode: foodInfo.barcode },
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
            createdBy: 'test-seed',
          },
        });
      }
    }
    
    // Create predictable test users
    const testUsers = [
      {
        keycloakId: 'test-user-1',
        email: 'test1@test.com',
        firstName: 'Test',
        lastName: 'User1',
        preferences: {
          dietaryRestrictions: ['vegetarian'],
          allergies: ['nuts'],
          preferredCategories: ['Test-Fruits'],
        },
      },
      {
        keycloakId: 'test-user-2',
        email: 'test2@test.com',
        firstName: 'Test',
        lastName: 'User2',
        preferences: {
          dietaryRestrictions: [],
          allergies: [],
          preferredCategories: ['Test-Proteins'],
        },
      },
    ];
    
    for (const userInfo of testUsers) {
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
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          preferences: userInfo.preferences,
        },
      });
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