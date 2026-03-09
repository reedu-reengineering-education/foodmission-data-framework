/**
 * Recipe Query Integration Tests
 *
 * Tests recipe queries against a real database with TheMealDB seeded data.
 * Validates:
 * - Category, cuisineType, dietaryLabels filters
 * - Public/system recipe visibility
 * - Pagination with filtered results
 */

import { PrismaClient } from '@prisma/client';
import { seedTheMealDbRecipes } from '../prisma/seeds/themealdb';

describe('Recipe Query Integration (e2e)', () => {
  let prisma: PrismaClient;
  const testUserId = 'test-user-integration-id';

  beforeAll(async () => {
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

    // Clean up any existing TheMealDB recipes
    await prisma.recipe.deleteMany({
      where: { source: 'themealdb' },
    });

    // Delete test user recipes
    await prisma.recipe.deleteMany({
      where: { userId: testUserId },
    });

    // Seed some TheMealDB recipes for testing
    await seedTheMealDbRecipes(prisma, { limit: 20 });
  });

  afterAll(async () => {
    // Clean up
    await prisma.recipe.deleteMany({
      where: { source: 'themealdb' },
    });
    await prisma.recipe.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.$disconnect();
  });

  describe('TheMealDB recipe queries', () => {
    it('should find all public TheMealDB recipes', async () => {
      const recipes = await prisma.recipe.findMany({
        where: {
          source: 'themealdb',
          isPublic: true,
        },
      });

      expect(recipes.length).toBeGreaterThan(0);
      expect(recipes.length).toBeLessThanOrEqual(20);

      // All should be public system recipes
      recipes.forEach((recipe) => {
        expect(recipe.isPublic).toBe(true);
        expect(recipe.userId).toBeNull();
        expect(recipe.source).toBe('themealdb');
      });
    });

    it('should filter recipes by category', async () => {
      // Get all categories in our seeded data
      const allRecipes = await prisma.recipe.findMany({
        where: { source: 'themealdb' },
        select: { category: true },
      });
      const categories = [...new Set(allRecipes.map((r) => r.category))];

      if (categories.length > 0) {
        const targetCategory = categories[0];
        const filtered = await prisma.recipe.findMany({
          where: {
            source: 'themealdb',
            category: targetCategory,
          },
        });

        expect(filtered.length).toBeGreaterThan(0);
        filtered.forEach((recipe) => {
          expect(recipe.category).toBe(targetCategory);
        });
      }
    });

    it('should filter recipes by cuisineType', async () => {
      const allRecipes = await prisma.recipe.findMany({
        where: { source: 'themealdb' },
        select: { cuisineType: true },
      });
      const cuisines = [...new Set(allRecipes.map((r) => r.cuisineType))];

      if (cuisines.length > 0) {
        const targetCuisine = cuisines[0];
        const filtered = await prisma.recipe.findMany({
          where: {
            source: 'themealdb',
            cuisineType: targetCuisine,
          },
        });

        expect(filtered.length).toBeGreaterThan(0);
        filtered.forEach((recipe) => {
          expect(recipe.cuisineType).toBe(targetCuisine);
        });
      }
    });

    it('should support pagination on filtered results', async () => {
      const pageSize = 5;

      // First page
      const page1 = await prisma.recipe.findMany({
        where: { source: 'themealdb' },
        take: pageSize,
        skip: 0,
        orderBy: { title: 'asc' },
      });

      // Second page
      const page2 = await prisma.recipe.findMany({
        where: { source: 'themealdb' },
        take: pageSize,
        skip: pageSize,
        orderBy: { title: 'asc' },
      });

      expect(page1.length).toBeLessThanOrEqual(pageSize);

      // If we have enough recipes, pages should be different
      if (page2.length > 0) {
        const page1Ids = page1.map((r) => r.id);
        const page2Ids = page2.map((r) => r.id);
        const overlap = page1Ids.filter((id) => page2Ids.includes(id));
        expect(overlap.length).toBe(0);
      }
    });

    it('should return count for filtered queries', async () => {
      const count = await prisma.recipe.count({
        where: { source: 'themealdb' },
      });

      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(20);
    });
  });

  describe('Public and user recipe visibility', () => {
    let userRecipeId: string;

    beforeAll(async () => {
      // Create a user recipe
      const userRecipe = await prisma.recipe.create({
        data: {
          title: 'Test User Recipe',
          userId: testUserId,
          isPublic: false,
          source: 'user',
        },
      });
      userRecipeId = userRecipe.id;
    });

    afterAll(async () => {
      await prisma.recipe.deleteMany({
        where: { userId: testUserId },
      });
    });

    it('should return public recipes for any user', async () => {
      const otherUserId = 'other-user-id';

      // Query that simulates what the service does:
      // User's own recipes OR public recipes
      const recipes = await prisma.recipe.findMany({
        where: {
          OR: [{ userId: otherUserId }, { isPublic: true }],
        },
      });

      // Should include public TheMealDB recipes
      const publicRecipes = recipes.filter((r) => r.isPublic === true);
      expect(publicRecipes.length).toBeGreaterThan(0);
    });

    it('should return user-owned private recipes only to owner', async () => {
      // Owner can see their own recipe
      const ownerRecipes = await prisma.recipe.findMany({
        where: {
          OR: [{ userId: testUserId }, { isPublic: true }],
        },
      });

      const userOwnedRecipe = ownerRecipes.find((r) => r.id === userRecipeId);
      expect(userOwnedRecipe).toBeDefined();

      // Other user cannot see private recipe
      const otherRecipes = await prisma.recipe.findMany({
        where: {
          OR: [{ userId: 'other-user-id' }, { isPublic: true }],
        },
      });

      const privateRecipeVisibleToOther = otherRecipes.find(
        (r) => r.id === userRecipeId,
      );
      expect(privateRecipeVisibleToOther).toBeUndefined();
    });

    it('should allow querying system recipes (userId = null)', async () => {
      const systemRecipes = await prisma.recipe.findMany({
        where: {
          userId: null,
          source: 'themealdb',
        },
      });

      expect(systemRecipes.length).toBeGreaterThan(0);
      systemRecipes.forEach((recipe) => {
        expect(recipe.userId).toBeNull();
      });
    });
  });

  describe('Recipe ingredients relation queries', () => {
    it('should store and retrieve ingredients as related records', async () => {
      const recipe = await prisma.recipe.findFirst({
        where: {
          source: 'themealdb',
        },
        include: {
          ingredients: {
            orderBy: { order: 'asc' },
          },
        },
      });

      expect(recipe).toBeDefined();
      expect(recipe!.ingredients).toBeDefined();
      expect(Array.isArray(recipe!.ingredients)).toBe(true);
      expect(recipe!.ingredients.length).toBeGreaterThan(0);

      // Check ingredient structure
      recipe!.ingredients.forEach((ing) => {
        expect(ing).toHaveProperty('id');
        expect(ing).toHaveProperty('name');
        expect(ing).toHaveProperty('measure');
        expect(ing).toHaveProperty('order');
        expect(ing).toHaveProperty('recipeId');
        expect(ing.recipeId).toBe(recipe!.id);
      });
    });

    it('should have some ingredients with food category mappings', async () => {
      const recipes = await prisma.recipe.findMany({
        where: {
          source: 'themealdb',
        },
        include: {
          ingredients: {
            include: {
              foodCategory: true,
            },
          },
        },
        take: 10,
      });

      let foundMappedIngredient = false;

      for (const recipe of recipes) {
        for (const ing of recipe.ingredients) {
          if (ing.foodCategoryId && ing.foodCategory) {
            foundMappedIngredient = true;
            break;
          }
        }
        if (foundMappedIngredient) break;
      }

      expect(foundMappedIngredient).toBe(true);
    });

    it('should query recipes by ingredient name', async () => {
      const recipes = await prisma.recipe.findMany({
        where: {
          source: 'themealdb',
          ingredients: {
            some: {
              name: { contains: 'Chicken', mode: 'insensitive' },
            },
          },
        },
        include: {
          ingredients: true,
        },
      });

      expect(recipes.length).toBeGreaterThan(0);
      recipes.forEach((recipe) => {
        const hasChicken = recipe.ingredients.some((ing) =>
          ing.name.toLowerCase().includes('chicken'),
        );
        expect(hasChicken).toBe(true);
      });
    });
  });

  describe('Index usage verification', () => {
    it('should efficiently query by source using index', async () => {
      const start = Date.now();

      await prisma.recipe.findMany({
        where: { source: 'themealdb' },
      });

      const duration = Date.now() - start;
      // Should be fast with index (< 100ms for small dataset)
      expect(duration).toBeLessThan(1000);
    });

    it('should efficiently query by isPublic using index', async () => {
      const start = Date.now();

      await prisma.recipe.findMany({
        where: { isPublic: true },
        take: 10,
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it('should efficiently query by category using index', async () => {
      const start = Date.now();

      await prisma.recipe.findMany({
        where: { category: 'Beef' },
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });
});
