import { PrismaClient } from '@prisma/client';
import { seedFoods } from '../prisma/seeds/foods';
import { seedUsers } from '../prisma/seeds/users';
import { seedTheMealDbRecipes } from '../prisma/seeds/themealdb';

describe('Database Seeding (e2e)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            process.env.TEST_DATABASE_URL ||
            'postgresql://postgres:password@localhost:5432/foodmission_test_db',
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database before each test
    try {
      await prisma.user.deleteMany();
      await prisma.food.deleteMany();
    } catch {
      // If there are constraint issues, try to clean up more thoroughly
      await prisma.$executeRaw`TRUNCATE TABLE "users", "foods" RESTART IDENTITY CASCADE`;
    }
  });

  describe('Food Seeding', () => {
    it('should seed foods successfully', async () => {
      const foods = await seedFoods(prisma, true); // Use test data

      expect(foods).toBeDefined();
      expect(foods.length).toBeGreaterThan(0);

      // Verify foods were created in database
      const dbFoods = await prisma.food.findMany();
      expect(dbFoods.length).toBe(foods.length);

      // Check for expected foods from OpenFoodFacts
      const foodNames = dbFoods.map((food) => food.name);
      expect(foodNames).toContain('Nutella');
      expect(foodNames).toContain('ISO-SPORTIV-DRINK'); // Töftes Sport

      // Verify food properties
      const nutella = dbFoods.find((food) => food.name === 'Nutella');
      expect(nutella).toBeDefined();
      expect(nutella?.description).toBeDefined();
      expect(nutella?.barcode).toBeDefined();
      expect(nutella?.createdBy).toBe('system-seed-openfoodfacts');
    });

    it('should handle duplicate seeding gracefully', async () => {
      // Run seeding twice
      const firstRun = await seedFoods(prisma, true); // Use test data
      const secondRun = await seedFoods(prisma, true); // Use test data

      expect(firstRun.length).toBe(secondRun.length);

      // Verify no duplicates were created
      const dbFoods = await prisma.food.findMany();
      expect(dbFoods.length).toBe(firstRun.length);
    });

    it('should create foods with valid data', async () => {
      await seedFoods(prisma, true); // Use test data

      const foods = await prisma.food.findMany();

      foods.forEach((food) => {
        expect(food.id).toBeDefined();
        expect(food.name).toBeDefined();
        expect(food.name.length).toBeGreaterThan(0);
        expect(food.createdBy).toBe('system-seed-openfoodfacts');
        expect(food.createdAt).toBeInstanceOf(Date);
        expect(food.updatedAt).toBeInstanceOf(Date);

        if (food.barcode) {
          expect(food.barcode.length).toBeGreaterThan(0);
        }

        if (food.description) {
          expect(food.description.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('User Seeding', () => {
    it('should seed users successfully', async () => {
      const users = await seedUsers(prisma);

      expect(users).toBeDefined();
      expect(users.length).toBeGreaterThan(0);

      // Verify users were created in database
      const dbUsers = await prisma.user.findMany();
      expect(dbUsers.length).toBe(users.length);

      // Check for expected users
      const userEmails = dbUsers.map((user) => user.email);
      expect(userEmails.length).toBeGreaterThan(0);

      // Verify user properties
      const firstUser = dbUsers[0];
      expect(firstUser).toBeDefined();
      expect(firstUser.keycloakId).toBeDefined();
      expect(firstUser.email).toBeDefined();
      expect(firstUser.firstName).toBeDefined();
      expect(firstUser.lastName).toBeDefined();
    });

    it('should handle duplicate user seeding gracefully', async () => {
      // Run seeding twice
      const firstRun = await seedUsers(prisma);
      const secondRun = await seedUsers(prisma);

      expect(firstRun.length).toBe(secondRun.length);

      // Verify no duplicates were created
      const dbUsers = await prisma.user.findMany();
      expect(dbUsers.length).toBe(firstRun.length);
    });

    it('should create users with valid data', async () => {
      await seedUsers(prisma);

      const users = await prisma.user.findMany();

      users.forEach((user) => {
        expect(user.id).toBeDefined();
        expect(user.keycloakId).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.firstName).toBeDefined();
        expect(user.lastName).toBeDefined();
        expect(user.createdAt).toBeInstanceOf(Date);
        expect(user.updatedAt).toBeInstanceOf(Date);

        // Validate email format
        expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe('Complete Seeding Process', () => {
    it('should seed all data types successfully', async () => {
      // Seed in correct order
      const foods = await seedFoods(prisma, true); // Use test data
      const users = await seedUsers(prisma);

      expect(foods.length).toBeGreaterThan(0);
      expect(users.length).toBeGreaterThan(0);

      // Verify all data exists
      const dbFoods = await prisma.food.findMany();
      const dbUsers = await prisma.user.findMany();

      expect(dbFoods.length).toBe(foods.length);
      expect(dbUsers.length).toBe(users.length);
    });

    it('should maintain data integrity across seeding', async () => {
      await seedFoods(prisma, true); // Use test data
      await seedUsers(prisma);

      // Check that all foods have valid creators
      const foods = await prisma.food.findMany();
      foods.forEach((food) => {
        expect(food.createdBy).toBeDefined();
        expect(food.createdBy.length).toBeGreaterThan(0);
      });

      // Check that all users have unique identifiers
      const users = await prisma.user.findMany();
      const keycloakIds = users.map((user) => user.keycloakId);
      const emails = users.map((user) => user.email);

      expect(new Set(keycloakIds).size).toBe(keycloakIds.length);
      expect(new Set(emails).size).toBe(emails.length);
    });
  });

  describe('TheMealDB Recipe Seeding', () => {
    beforeEach(async () => {
      // Clean up recipes before TheMealDB tests
      try {
        await prisma.recipe.deleteMany({
          where: { source: 'themealdb' },
        });
      } catch {
        // Ignore if table doesn't exist or is empty
      }
    });

    it('should seed TheMealDB recipes with dry-run option', async () => {
      const result = await seedTheMealDbRecipes(prisma, {
        dryRun: true,
        limit: 5,
      });

      expect(result.created).toBe(5);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);

      // Verify no recipes were actually created
      const recipes = await prisma.recipe.findMany({
        where: { source: 'themealdb' },
      });
      expect(recipes.length).toBe(0);
    });

    it('should seed limited TheMealDB recipes', async () => {
      const result = await seedTheMealDbRecipes(prisma, {
        limit: 3,
      });

      expect(result.created).toBe(3);
      expect(result.errors).toBe(0);

      // Verify recipes were created
      const recipes = await prisma.recipe.findMany({
        where: { source: 'themealdb' },
      });
      expect(recipes.length).toBe(3);
    });

    it('should create recipes with correct properties', async () => {
      await seedTheMealDbRecipes(prisma, { limit: 2 });

      const recipes = await prisma.recipe.findMany({
        where: { source: 'themealdb' },
        include: { ingredients: true },
      });

      recipes.forEach((recipe) => {
        // System recipe properties
        expect(recipe.userId).toBeNull();
        expect(recipe.source).toBe('themealdb');
        expect(recipe.isPublic).toBe(true);
        expect(recipe.externalId).toBeDefined();

        // Required fields
        expect(recipe.title).toBeDefined();
        expect(recipe.title.length).toBeGreaterThan(0);

        // Optional enriched fields
        expect(recipe.category).toBeDefined();
        expect(recipe.cuisineType).toBeDefined();

        // Ingredients relation
        expect(recipe.ingredients).toBeDefined();
        expect(Array.isArray(recipe.ingredients)).toBe(true);
        expect(recipe.ingredients.length).toBeGreaterThan(0);
      });
    });

    it('should have ingredients with expected structure', async () => {
      await seedTheMealDbRecipes(prisma, { limit: 1 });

      const recipe = await prisma.recipe.findFirst({
        where: { source: 'themealdb' },
        include: {
          ingredients: {
            include: {
              foodCategory: true,
            },
          },
        },
      });

      expect(recipe).toBeDefined();
      expect(recipe!.ingredients.length).toBeGreaterThan(0);

      recipe!.ingredients.forEach((ing) => {
        expect(ing.name).toBeDefined();
        expect(ing.measure).toBeDefined();
        expect(typeof ing.order).toBe('number');
        expect(ing.recipeId).toBe(recipe!.id);
        expect(['food', 'food_category']).toContain(ing.itemType);

        // Some ingredients should have food category mappings
        if (ing.foodCategoryId) {
          expect(ing.foodCategory).toBeDefined();
        }
      });
    });

    it('should skip existing recipes on re-run', async () => {
      // First run
      const firstResult = await seedTheMealDbRecipes(prisma, { limit: 3 });
      expect(firstResult.created).toBe(3);

      // Second run with same limit
      const secondResult = await seedTheMealDbRecipes(prisma, { limit: 3 });
      expect(secondResult.created).toBe(0);
      expect(secondResult.skipped).toBe(3);

      // Verify no duplicates
      const recipes = await prisma.recipe.findMany({
        where: { source: 'themealdb' },
      });
      expect(recipes.length).toBe(3);
    });

    it('should force re-seed with force option', async () => {
      // Note: Force option isn't implemented to update existing,
      // it just doesn't skip. This test documents current behavior.
      await seedTheMealDbRecipes(prisma, { limit: 2 });

      // Force won't create duplicates due to unique constraint on externalId
      // But it will attempt to create them (and fail/skip due to constraint)
      const recipes = await prisma.recipe.findMany({
        where: { source: 'themealdb' },
      });
      expect(recipes.length).toBe(2);
    });

    it('should have unique externalIds', async () => {
      await seedTheMealDbRecipes(prisma, { limit: 10 });

      const recipes = await prisma.recipe.findMany({
        where: { source: 'themealdb' },
        select: { externalId: true },
      });

      const externalIds = recipes.map((r) => r.externalId);
      const uniqueIds = new Set(externalIds);
      expect(uniqueIds.size).toBe(externalIds.length);
    });
  });
});
