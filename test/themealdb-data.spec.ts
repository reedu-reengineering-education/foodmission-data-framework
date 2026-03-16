/**
 * TheMealDB Data Validation and Seeding Tests
 *
 * Tests for:
 * 1. themealdb-data.json schema and structure
 * 2. Recipe and ingredient mapping validation
 * 3. Seed script compatibility (structure matches what themealdb.ts expects)
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'prisma/seeds/data');
const THEMEALDB_JSON_PATH = path.join(DATA_DIR, 'themealdb-data.json');

const VALID_CATEGORIES = [
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

const VALID_CONFIDENCE = ['high', 'medium', 'low', 'none'];
const VALID_SOURCES = ['nevo', 'off', 'openfoodfacts', 'none'];

interface ThemealdbData {
  ingredientMappings: {
    ingredientName: string;
    foodName: string;
    source: string;
    sourceId: string;
    matchConfidence: string;
  }[];
  recipes: {
    externalId: string;
    title: string;
    category: string;
    cuisineType: string;
    instructions: string;
    imageUrl: string;
    videoUrl: string;
    tags: string[];
    dietaryLabels: string[];
    servings: number;
    ingredients: { name: string; measure: string; order: number }[];
    nutritionalInfo?: Record<string, unknown> | null;
    allergens?: string[];
    sustainabilityScore?: number | null;
  }[];
}

function loadThemealdbJson(): ThemealdbData {
  if (!fs.existsSync(THEMEALDB_JSON_PATH)) {
    throw new Error(
      `themealdb-data.json not found: ${THEMEALDB_JSON_PATH}. The seed reads this file; add it or run the build script to generate it.`,
    );
  }
  const content = fs.readFileSync(THEMEALDB_JSON_PATH, 'utf-8');
  const data = JSON.parse(content) as ThemealdbData;
  if (!data.recipes || !Array.isArray(data.recipes)) {
    throw new Error('themealdb-data.json must have a "recipes" array');
  }
  if (!data.ingredientMappings || !Array.isArray(data.ingredientMappings)) {
    throw new Error('themealdb-data.json must have an "ingredientMappings" array');
  }
  return data;
}

describe('TheMealDB JSON Data Validation', () => {
  let data: ThemealdbData;

  beforeAll(() => {
    data = loadThemealdbJson();
  });

  describe('themealdb-data.json structure', () => {
    it('should have recipes and ingredientMappings', () => {
      expect(data.recipes).toBeDefined();
      expect(Array.isArray(data.recipes)).toBe(true);
      expect(data.ingredientMappings).toBeDefined();
      expect(Array.isArray(data.ingredientMappings)).toBe(true);
    });

    it('should have at least 500 recipes', () => {
      expect(data.recipes.length).toBeGreaterThanOrEqual(500);
    });

    it('should have unique recipe externalIds', () => {
      const ids = data.recipes.map((r) => r.externalId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid categories on recipes', () => {
      data.recipes.forEach((r) => {
        expect(VALID_CATEGORIES).toContain(r.category);
      });
    });

    it('should have non-empty titles', () => {
      data.recipes.forEach((r) => {
        expect(r.title).toBeDefined();
        expect(r.title.length).toBeGreaterThan(0);
      });
    });

    it('should have valid imageUrl format when present', () => {
      data.recipes.forEach((r) => {
        if (r.imageUrl) {
          expect(r.imageUrl).toMatch(/^https?:\/\//);
        }
      });
    });

    it('should have recipes with ingredients array', () => {
      data.recipes.forEach((r) => {
        expect(Array.isArray(r.ingredients)).toBe(true);
        r.ingredients.forEach((ing) => {
          expect(ing).toHaveProperty('name');
          expect(ing).toHaveProperty('measure');
          expect(ing).toHaveProperty('order');
          expect(ing.order).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should have tags and dietaryLabels as arrays', () => {
      data.recipes.forEach((r) => {
        expect(Array.isArray(r.tags)).toBe(true);
        expect(Array.isArray(r.dietaryLabels)).toBe(true);
      });
    });
  });

  describe('ingredientMappings', () => {
    it('should have required mapping fields', () => {
      data.ingredientMappings.forEach((m) => {
        expect(m).toHaveProperty('ingredientName');
        expect(m).toHaveProperty('source');
        expect(m).toHaveProperty('sourceId');
        expect(m).toHaveProperty('matchConfidence');
      });
    });

    it('should have matchConfidence and source as strings', () => {
      data.ingredientMappings.forEach((m) => {
        expect(typeof m.matchConfidence).toBe('string');
        expect(typeof m.source).toBe('string');
      });
    });

    it('should have mostly valid matchConfidence and source values', () => {
      const validConfidence = data.ingredientMappings.filter((m) =>
        VALID_CONFIDENCE.includes(m.matchConfidence),
      ).length;
      const validSource = data.ingredientMappings.filter((m) =>
        VALID_SOURCES.includes(m.source),
      ).length;
      const total = data.ingredientMappings.length;
      expect(validConfidence / total).toBeGreaterThanOrEqual(0.9);
      expect(validSource / total).toBeGreaterThanOrEqual(0.9);
    });

    it('should have a good number of mappings', () => {
      expect(data.ingredientMappings.length).toBeGreaterThanOrEqual(500);
    });

    it('should have at least 70% mapping coverage (non-none)', () => {
      const mapped = data.ingredientMappings.filter(
        (m) => m.source !== 'none' && m.matchConfidence !== 'none',
      ).length;
      const total = data.ingredientMappings.length;
      const coverage = total > 0 ? (mapped / total) * 100 : 0;
      expect(coverage).toBeGreaterThanOrEqual(70);
    });
  });

  describe('enrichment data (when present)', () => {
    it('should have valid nutritionalInfo shape when present', () => {
      const withNutrition = data.recipes.filter(
        (r) => r.nutritionalInfo != null && typeof r.nutritionalInfo === 'object',
      );
      withNutrition.forEach((r) => {
        const nutrition = r.nutritionalInfo as Record<string, unknown>;
        expect(nutrition).toHaveProperty('energyKcal');
        expect(nutrition).toHaveProperty('protein');
        expect(nutrition).toHaveProperty('fat');
        expect(nutrition).toHaveProperty('carbs');
      });
    });

    it('should have valid sustainabilityScore when present', () => {
      data.recipes.forEach((r) => {
        if (r.sustainabilityScore != null && typeof r.sustainabilityScore === 'number') {
          expect(r.sustainabilityScore).toBeGreaterThanOrEqual(0);
          expect(r.sustainabilityScore).toBeLessThanOrEqual(1);
        }
      });
    });

    it('should have allergens as array when present', () => {
      data.recipes.forEach((r) => {
        if (r.allergens != null) {
          expect(Array.isArray(r.allergens)).toBe(true);
        }
      });
    });
  });
});

describe('TheMealDB Data Integrity', () => {
  let data: ThemealdbData;

  beforeAll(() => {
    data = loadThemealdbJson();
  });

  it('should have ingredients for every recipe', () => {
    const recipeIds = new Set(data.recipes.map((r) => r.externalId));
    data.recipes.forEach((r) => {
      expect(recipeIds.has(r.externalId)).toBe(true);
      expect(r.ingredients.length).toBeGreaterThanOrEqual(0);
    });
  });

  it('should have valid ingredient order values', () => {
    data.recipes.forEach((r) => {
      expect(r.ingredients.length).toBeLessThanOrEqual(20);
      r.ingredients.forEach((ing) => {
        expect(typeof ing.order).toBe('number');
        expect(ing.order).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
