import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { seedCategories } from '../prisma/seeds/categories';
import { seedFoods } from '../prisma/seeds/foods';
import { seedUsers } from '../prisma/seeds/users';

describe('Database Seeding (e2e)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            'postgresql://postgres:postgres@localhost:5432/foodmission_test',
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.userPreferences.deleteMany();
    await prisma.user.deleteMany();
    await prisma.food.deleteMany();
    await prisma.foodCategory.deleteMany();
  });

  describe('Category Seeding', () => {
    it('should seed food categories successfully', async () => {
      const categories = await seedCategories(prisma);

      expect(categories).toBeDefined();
      expect(categories.length).toBeGreaterThan(0);

      // Verify categories were created in database
      const dbCategories = await prisma.foodCategory.findMany();
      expect(dbCategories.length).toBe(categories.length);

      // Check for expected categories
      const categoryNames = dbCategories.map((cat) => cat.name);
      expect(categoryNames).toContain('Fruits');
      expect(categoryNames).toContain('Vegetables');
      expect(categoryNames).toContain('Dairy');
    });

    it('should handle duplicate category seeding (upsert)', async () => {
      // Seed categories twice
      const firstRun = await seedCategories(prisma);
      const secondRun = await seedCategories(prisma);

      expect(firstRun.length).toBe(secondRun.length);

      // Verify no duplicates were created
      const dbCategories = await prisma.foodCategory.findMany();
      expect(dbCategories.length).toBe(firstRun.length);
    });
  });

  describe('Food Seeding', () => {
    beforeEach(async () => {
      // Categories are required for foods
      await seedCategories(prisma);
    });

    it('should seed food items successfully', async () => {
      const foods = await seedFoods(prisma);

      expect(foods).toBeDefined();
      expect(foods.length).toBeGreaterThan(0);

      // Verify foods were created in database
      const dbFoods = await prisma.food.findMany({
        include: { category: true },
      });
      expect(dbFoods.length).toBe(foods.length);

      // Check that all foods have valid categories
      dbFoods.forEach((food) => {
        expect(food.category).toBeDefined();
        expect(food.categoryId).toBeTruthy();
      });
    });

    it('should create foods with proper barcodes', async () => {
      await seedFoods(prisma);

      const foodsWithBarcodes = await prisma.food.findMany({
        where: {
          barcode: {
            not: null,
          },
        },
      });

      expect(foodsWithBarcodes.length).toBeGreaterThan(0);

      // Check barcode uniqueness
      const barcodes = foodsWithBarcodes.map((food) => food.barcode);
      const uniqueBarcodes = new Set(barcodes);
      expect(uniqueBarcodes.size).toBe(barcodes.length);
    });

    it('should handle duplicate food seeding (upsert)', async () => {
      // Seed foods twice
      const firstRun = await seedFoods(prisma);
      const secondRun = await seedFoods(prisma);

      expect(firstRun.length).toBe(secondRun.length);

      // Verify no duplicates were created
      const dbFoods = await prisma.food.findMany();
      expect(dbFoods.length).toBe(firstRun.length);
    });
  });

  describe('User Seeding', () => {
    it('should seed users successfully', async () => {
      const users = await seedUsers(prisma);

      expect(users).toBeDefined();
      expect(users.length).toBeGreaterThan(0);

      // Verify users were created in database
      const dbUsers = await prisma.user.findMany({
        include: { preferences: true },
      });
      expect(dbUsers.length).toBe(users.length);
    });

    it('should create user preferences correctly', async () => {
      await seedUsers(prisma);

      const usersWithPreferences = await prisma.user.findMany({
        include: { preferences: true },
        where: {
          preferences: {
            isNot: null,
          },
        },
      });

      expect(usersWithPreferences.length).toBeGreaterThan(0);

      // Check preference structure
      usersWithPreferences.forEach((user) => {
        expect(user.preferences).toBeDefined();
        expect(Array.isArray(user.preferences!.dietaryRestrictions)).toBe(true);
        expect(Array.isArray(user.preferences!.allergies)).toBe(true);
        expect(Array.isArray(user.preferences!.preferredCategories)).toBe(true);
      });
    });

    it('should handle duplicate user seeding (upsert)', async () => {
      // Seed users twice
      const firstRun = await seedUsers(prisma);
      const secondRun = await seedUsers(prisma);

      expect(firstRun.length).toBe(secondRun.length);

      // Verify no duplicates were created
      const dbUsers = await prisma.user.findMany();
      expect(dbUsers.length).toBe(firstRun.length);
    });

    it('should ensure unique keycloak IDs and emails', async () => {
      await seedUsers(prisma);

      const users = await prisma.user.findMany();

      // Check keycloak ID uniqueness
      const keycloakIds = users.map((user) => user.keycloakId);
      const uniqueKeycloakIds = new Set(keycloakIds);
      expect(uniqueKeycloakIds.size).toBe(keycloakIds.length);

      // Check email uniqueness
      const emails = users.map((user) => user.email);
      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(emails.length);
    });
  });

  describe('Complete Seeding Flow', () => {
    it('should seed all data types in correct order', async () => {
      // Seed in dependency order
      const categories = await seedCategories(prisma);
      const foods = await seedFoods(prisma);
      const users = await seedUsers(prisma);

      // Verify all data was created
      expect(categories.length).toBeGreaterThan(0);
      expect(foods.length).toBeGreaterThan(0);
      expect(users.length).toBeGreaterThan(0);

      // Verify relationships
      const foodsWithCategories = await prisma.food.findMany({
        include: { category: true },
      });

      foodsWithCategories.forEach((food) => {
        expect(food.category).toBeDefined();
        expect(categories.some((cat) => cat.id === food.categoryId)).toBe(true);
      });
    });

    it('should maintain referential integrity', async () => {
      await seedCategories(prisma);
      await seedFoods(prisma);
      await seedUsers(prisma);

      // Try to delete a category that has foods - should fail
      const categoryWithFoods = await prisma.foodCategory.findFirst({
        include: { foods: true },
        where: {
          foods: {
            some: {},
          },
        },
      });

      if (categoryWithFoods) {
        await expect(
          prisma.foodCategory.delete({
            where: { id: categoryWithFoods.id },
          }),
        ).rejects.toThrow();
      }
    });
  });
});
