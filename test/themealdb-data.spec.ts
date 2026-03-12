/**
 * TheMealDB Data Validation and Seeding Tests
 *
 * Tests for:
 * 1. CSV schema validation
 * 2. Data enrichment validation
 * 3. Seed script functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import { csvToObjects } from '../scripts/parse-csv';

// Use process.cwd() instead of __dirname to get the workspace root
const DATA_DIR = path.join(process.cwd(), 'prisma/seeds/data');

// Expected CSV schemas
const RECIPES_SCHEMA = [
  'externalId',
  'title',
  'category',
  'cuisineType',
  'instructions',
  'imageUrl',
  'videoUrl',
  'tags',
  'dietaryLabels',
  'servings',
];

const INGREDIENTS_SCHEMA = [
  'recipeExternalId',
  'ingredientName',
  'measure',
  'order',
];

const MAPPING_SCHEMA = [
  'ingredientName',
  'foodName',
  'source',
  'sourceId',
  'matchConfidence',
  'energyKcal',
  'protein',
  'fat',
  'carbs',
  'fiber',
  'allergens',
  'ecoscoreGrade',
  'nutriscoreGrade',
];

const ENRICHED_SCHEMA = [
  'externalId',
  'title',
  'category',
  'cuisineType',
  'instructions',
  'imageUrl',
  'videoUrl',
  'tags',
  'dietaryLabels',
  'servings',
  'nutritionalInfo',
  'allergens',
  'sustainabilityScore',
  'ingredientCount',
  'mappedIngredientCount',
];

/**
 * Helper to load and parse CSV
 */
function loadCsv(filename: string): Record<string, string>[] {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return csvToObjects(content);
}

describe('TheMealDB CSV Schema Validation', () => {
  describe('themealdb-recipes.csv', () => {
    let recipes: Record<string, string>[];

    beforeAll(() => {
      recipes = loadCsv('themealdb-recipes.csv');
    });

    it('should have correct column headers', () => {
      const headers = Object.keys(recipes[0]);
      RECIPES_SCHEMA.forEach((col) => {
        expect(headers).toContain(col);
      });
    });

    it('should have at least 500 recipes', () => {
      expect(recipes.length).toBeGreaterThanOrEqual(500);
    });

    it('should have unique externalIds', () => {
      const ids = recipes.map((r) => r.externalId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid categories', () => {
      const validCategories = [
        'Beef',
        'Chicken',
        'Dessert',
        'Lamb',
        'Miscellaneous',
        'Pasta',
        'Pork',
        'Seafood',
        'Side',
        'Starter',
        'Vegan',
        'Vegetarian',
        'Breakfast',
        'Goat',
      ];
      recipes.forEach((r) => {
        expect(validCategories).toContain(r.category);
      });
    });

    it('should have non-empty titles', () => {
      recipes.forEach((r) => {
        expect(r.title).toBeDefined();
        expect(r.title.length).toBeGreaterThan(0);
      });
    });

    it('should have valid imageUrl format', () => {
      recipes.forEach((r) => {
        if (r.imageUrl) {
          expect(r.imageUrl).toMatch(/^https?:\/\//);
        }
      });
    });
  });

  describe('themealdb-ingredients.csv', () => {
    let ingredients: Record<string, string>[];

    beforeAll(() => {
      ingredients = loadCsv('themealdb-ingredients.csv');
    });

    it('should have correct column headers', () => {
      const headers = Object.keys(ingredients[0]);
      INGREDIENTS_SCHEMA.forEach((col) => {
        expect(headers).toContain(col);
      });
    });

    it('should have ingredients for recipes', () => {
      expect(ingredients.length).toBeGreaterThan(5000);
    });

    it('should have valid order values', () => {
      ingredients.forEach((i) => {
        const order = parseInt(i.order, 10);
        expect(order).toBeGreaterThanOrEqual(1);
        expect(order).toBeLessThanOrEqual(20);
      });
    });

    it('should link to existing recipes', () => {
      const recipes = loadCsv('themealdb-recipes.csv');
      const recipeIds = new Set(recipes.map((r) => r.externalId));
      ingredients.forEach((i) => {
        expect(recipeIds.has(i.recipeExternalId)).toBe(true);
      });
    });
  });

  describe('ingredient-food-mapping.csv', () => {
    let mappings: Record<string, string>[];

    beforeAll(() => {
      mappings = loadCsv('ingredient-food-mapping.csv');
    });

    it('should have correct column headers', () => {
      const headers = Object.keys(mappings[0]);
      MAPPING_SCHEMA.forEach((col) => {
        expect(headers).toContain(col);
      });
    });

    it('should have mappings for unique ingredients', () => {
      expect(mappings.length).toBeGreaterThanOrEqual(800);
    });

    it('should have valid confidence levels', () => {
      const validConfidence = ['high', 'medium', 'low', 'none'];
      mappings.forEach((m) => {
        expect(validConfidence).toContain(m.matchConfidence);
      });
    });

    it('should have valid source values', () => {
      const validSources = ['nevo', 'off', 'none'];
      mappings.forEach((m) => {
        expect(validSources).toContain(m.source);
      });
    });

    it('should have nutrition data for mapped ingredients', () => {
      const mappedIngredients = mappings.filter(
        (m) => m.source !== 'none' && m.matchConfidence !== 'none',
      );
      expect(mappedIngredients.length).toBeGreaterThan(500);

      mappedIngredients.forEach((m) => {
        // NEVO-mapped ingredients should have nutrition values
        if (m.source === 'nevo') {
          expect(m.energyKcal).toBeDefined();
        }
      });
    });

    it('should have at least 70% mapping coverage', () => {
      const mapped = mappings.filter(
        (m) => m.source !== 'none' && m.matchConfidence !== 'none',
      ).length;
      const total = mappings.length;
      const coverage = (mapped / total) * 100;
      expect(coverage).toBeGreaterThanOrEqual(70);
    });
  });

  describe('enriched-recipes.csv', () => {
    let enriched: Record<string, string>[];

    beforeAll(() => {
      enriched = loadCsv('enriched-recipes.csv');
    });

    it('should have correct column headers', () => {
      const headers = Object.keys(enriched[0]);
      ENRICHED_SCHEMA.forEach((col) => {
        expect(headers).toContain(col);
      });
    });

    it('should have same number of recipes as source', () => {
      const recipes = loadCsv('themealdb-recipes.csv');
      expect(enriched.length).toBe(recipes.length);
    });

    it('should have valid nutritionalInfo JSON', () => {
      enriched.forEach((r) => {
        expect(r.nutritionalInfo).toBeDefined();
        const nutrition = JSON.parse(r.nutritionalInfo);
        expect(nutrition).toHaveProperty('energyKcal');
        expect(nutrition).toHaveProperty('protein');
        expect(nutrition).toHaveProperty('fat');
        expect(nutrition).toHaveProperty('carbs');
        expect(nutrition).toHaveProperty('fiber');
      });
    });

    it('should have valid sustainability scores', () => {
      enriched.forEach((r) => {
        const score = parseFloat(r.sustainabilityScore);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    it('should have valid ingredient counts', () => {
      enriched.forEach((r) => {
        const total = parseInt(r.ingredientCount, 10);
        const mapped = parseInt(r.mappedIngredientCount, 10);
        expect(total).toBeGreaterThanOrEqual(1);
        expect(mapped).toBeGreaterThanOrEqual(0);
        expect(mapped).toBeLessThanOrEqual(total);
      });
    });

    it('should detect common allergens', () => {
      // Find recipes that should have specific allergens
      const recipesWithGluten = enriched.filter((r) =>
        r.allergens.includes('gluten'),
      );
      const recipesWithMilk = enriched.filter((r) =>
        r.allergens.includes('milk'),
      );
      const recipesWithEggs = enriched.filter((r) =>
        r.allergens.includes('eggs'),
      );

      // Pasta recipes should generally have gluten
      expect(recipesWithGluten.length).toBeGreaterThan(50);
      // Many recipes have dairy
      expect(recipesWithMilk.length).toBeGreaterThan(100);
      // Some recipes have eggs
      expect(recipesWithEggs.length).toBeGreaterThan(50);
    });
  });
});

describe('TheMealDB Data Integrity', () => {
  it('should have consistent recipe IDs across files', () => {
    const recipes = loadCsv('themealdb-recipes.csv');
    const ingredients = loadCsv('themealdb-ingredients.csv');
    const enriched = loadCsv('enriched-recipes.csv');

    const recipeIds = new Set(recipes.map((r) => r.externalId));
    const ingredientRecipeIds = new Set(
      ingredients.map((i) => i.recipeExternalId),
    );
    const enrichedIds = new Set(enriched.map((r) => r.externalId));

    // All ingredient entries should reference existing recipes
    ingredientRecipeIds.forEach((id) => {
      expect(recipeIds.has(id)).toBe(true);
    });

    // All enriched recipes should match source recipes
    enrichedIds.forEach((id) => {
      expect(recipeIds.has(id)).toBe(true);
    });
  });

  it('should have ingredients for all enriched recipes', () => {
    const enriched = loadCsv('enriched-recipes.csv');
    const ingredients = loadCsv('themealdb-ingredients.csv');

    const ingredientsByRecipe = new Map<string, number>();
    ingredients.forEach((i) => {
      const count = ingredientsByRecipe.get(i.recipeExternalId) || 0;
      ingredientsByRecipe.set(i.recipeExternalId, count + 1);
    });

    enriched.forEach((r) => {
      const csvCount = ingredientsByRecipe.get(r.externalId) || 0;
      const reportedCount = parseInt(r.ingredientCount, 10);
      expect(csvCount).toBe(reportedCount);
    });
  });
});
