/**
 * TheMealDB Recipe Seeding Script
 *
 * Seeds the database with recipes from TheMealDB, enriched with food mappings
 * from the NEVO Dutch Food Composition Database.
 *
 * This is a production-ready script that:
 * - Loads recipes from CSV (extracted from TheMealDB API)
 * - Loads ingredients with measures for each recipe
 * - Maps ingredients to Food records where matches exist (via NEVO)
 * - Creates Recipe records with userId=null (system recipes)
 * - Sets isPublic=true for all imported recipes
 *
 * Data Sources:
 * - TheMealDB API: https://www.themealdb.com/api.php
 * - NEVO Dutch Food Composition Database: https://nevo-online.rivm.nl/
 *
 * Usage:
 *   npx ts-node prisma/seeds/themealdb.ts           # Seed all recipes
 *   npx ts-node prisma/seeds/themealdb.ts --limit=50  # Seed first 50 recipes
 *   npx ts-node prisma/seeds/themealdb.ts --dry-run   # Preview without seeding
 *
 * @see docs/DATABASE_SEEDING_MIGRATION.md for full documentation
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parse: csvParse } = require('csv-parse/sync');

// Paths to data files
const DATA_DIR = path.join(__dirname, 'data');
const RECIPES_PATH = path.join(DATA_DIR, 'themealdb-recipes.csv');
const INGREDIENTS_PATH = path.join(DATA_DIR, 'themealdb-ingredients.csv');
const MAPPING_PATH = path.join(DATA_DIR, 'ingredient-food-mapping.csv');

// Types
interface RecipeRow {
  externalId: string;
  title: string;
  category: string;
  cuisineType: string;
  instructions: string;
  imageUrl: string;
  videoUrl: string;
  tags: string;
  dietaryLabels: string;
  servings: string;
}

interface IngredientRow {
  recipeExternalId: string;
  ingredientName: string;
  measure: string;
  order: string;
}

interface MappingRow {
  ingredientName: string;
  foodName: string;
  source: string;
  sourceId: string;
  matchConfidence: string;
  energyKcal: string;
  protein: string;
  fat: string;
  carbs: string;
  fiber: string;
  allergens: string;
  ecoscoreGrade: string;
  nutriscoreGrade: string;
}

interface RecipeIngredientData {
  name: string;
  measure: string;
  order: number;
  // Link to Food table (OpenFoodFacts products)
  foodId?: string;
  // Link to FoodCategory table (NEVO generic foods)
  foodCategoryId?: string;
  // Derived itemType for Prisma
  itemType: 'food' | 'food_category';
}

interface SeedOptions {
  limit?: number;
  dryRun?: boolean;
  skipExisting?: boolean;
}

/**
 * Load and parse a CSV file
 */
function loadCsv<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return csvParse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

/**
 * Build ingredient-to-food mapping from CSV
 */
function buildIngredientMapping(
  mappings: MappingRow[],
): Map<string, MappingRow> {
  const map = new Map<string, MappingRow>();
  for (const row of mappings) {
    if (row.source !== 'none' && row.matchConfidence !== 'none') {
      map.set(row.ingredientName.toLowerCase().trim(), row);
    }
  }
  return map;
}

/**
 * Group ingredients by recipe external ID
 */
function groupIngredientsByRecipe(
  ingredients: IngredientRow[],
): Map<string, IngredientRow[]> {
  const map = new Map<string, IngredientRow[]>();
  for (const ing of ingredients) {
    const recipeId = ing.recipeExternalId;
    if (!map.has(recipeId)) {
      map.set(recipeId, []);
    }
    map.get(recipeId)!.push(ing);
  }
  return map;
}

/**
 * Parse tags string into array
 */
function parseTags(tagsStr: string): string[] {
  if (!tagsStr || tagsStr.trim() === '') return [];
  return tagsStr
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Parse servings string to number
 */
function parseServings(servingsStr: string): number | null {
  if (!servingsStr || servingsStr.trim() === '') return 4; // default
  const num = parseInt(servingsStr, 10);
  return isNaN(num) ? 4 : num;
}

/**
 * Main seeding function for TheMealDB recipes
 */
export async function seedTheMealDbRecipes(
  prisma: PrismaClient,
  options: SeedOptions = {},
): Promise<{ created: number; skipped: number; errors: number }> {
  const { limit, dryRun = false, skipExisting = true } = options;

  console.log('🍽️  Loading TheMealDB recipe data...');

  // Load CSVs
  const recipes = loadCsv<RecipeRow>(RECIPES_PATH);
  const ingredients = loadCsv<IngredientRow>(INGREDIENTS_PATH);
  const mappings = loadCsv<MappingRow>(MAPPING_PATH);

  console.log(`   📄 ${recipes.length} recipes`);
  console.log(`   🥕 ${ingredients.length} ingredient entries`);
  console.log(`   🔗 ${mappings.length} ingredient mappings`);

  // Build lookup maps
  const ingredientMapping = buildIngredientMapping(mappings);
  const ingredientsByRecipe = groupIngredientsByRecipe(ingredients);

  const mappedCount = ingredientMapping.size;
  console.log(
    `   ✅ ${mappedCount} ingredients mapped to foods (${Math.round((mappedCount / 836) * 100)}%)`,
  );

  // Build lookup maps for linking ingredients
  const foodIdMap = new Map<string, string>(); // Food.name -> Food.id
  const foodCategoryMap = new Map<number, string>(); // nevoCode -> FoodCategory.id
  const nevoCodeByName = new Map<string, number>(); // FoodCategory.foodName -> nevoCode

  if (!dryRun) {
    // Get Food records (OpenFoodFacts products) - for future OFF ingredient links
    const foods = await prisma.food.findMany({
      select: { id: true, name: true },
    });
    for (const food of foods) {
      foodIdMap.set(food.name.toLowerCase(), food.id);
    }
    console.log(`   🍎 ${foods.length} Food records available for linking`);

    // Get FoodCategory records (NEVO generic foods)
    const foodCategories = await prisma.foodCategory.findMany({
      select: { id: true, nevoCode: true, foodName: true },
    });
    for (const fc of foodCategories) {
      foodCategoryMap.set(fc.nevoCode, fc.id);
      nevoCodeByName.set(fc.foodName.toLowerCase(), fc.nevoCode);
    }
    console.log(
      `   🥗 ${foodCategories.length} FoodCategory (NEVO) records available for linking`,
    );
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  const recipesToProcess = limit ? recipes.slice(0, limit) : recipes;

  console.log(
    `\n🌱 ${dryRun ? '[DRY RUN] ' : ''}Seeding ${recipesToProcess.length} recipes...`,
  );

  for (const recipe of recipesToProcess) {
    try {
      // Check if recipe already exists
      if (skipExisting && !dryRun) {
        const existing = await prisma.recipe.findUnique({
          where: { externalId: recipe.externalId },
        });
        if (existing) {
          skipped++;
          continue;
        }
      }

      // Build ingredients data for RecipeIngredient records
      const recipeIngredients =
        ingredientsByRecipe.get(recipe.externalId) || [];
      const ingredientsData: RecipeIngredientData[] = recipeIngredients.map(
        (ing) => {
          const key = ing.ingredientName.toLowerCase().trim();
          const mapping = ingredientMapping.get(key);

          const ingredient: RecipeIngredientData = {
            name: ing.ingredientName,
            measure: ing.measure,
            order: parseInt(ing.order, 10) || 0,
            itemType: 'food_category', // Default to food_category
          };

          if (mapping) {
            // Link based on source type
            if (mapping.source === 'nevo' && mapping.sourceId) {
              // Link to FoodCategory (NEVO) via nevoCode lookup
              const nevoCode = parseInt(mapping.sourceId, 10);
              if (!isNaN(nevoCode)) {
                const fcId = foodCategoryMap.get(nevoCode);
                if (fcId) {
                  ingredient.foodCategoryId = fcId;
                  ingredient.itemType = 'food_category';
                }
              }
            } else if (mapping.source === 'off') {
              // Link to Food (OpenFoodFacts) - by name match
              const foodId = foodIdMap.get(mapping.foodName.toLowerCase());
              if (foodId) {
                ingredient.foodId = foodId;
                ingredient.itemType = 'food';
              }
            }
          }

          return ingredient;
        },
      );

      if (dryRun) {
        console.log(
          `  Would create: ${recipe.title} (${ingredientsData.length} ingredients)`,
        );
        created++;
        continue;
      }

      // Create recipe with ingredients in a transaction
      await prisma.$transaction(async (tx) => {
        // Create recipe record
        const createdRecipe = await tx.recipe.create({
          data: {
            externalId: recipe.externalId,
            title: recipe.title,
            category: recipe.category || null,
            cuisineType: recipe.cuisineType || null,
            instructions: recipe.instructions || null,
            imageUrl: recipe.imageUrl || null,
            videoUrl: recipe.videoUrl || null,
            tags: parseTags(recipe.tags),
            dietaryLabels: parseTags(recipe.dietaryLabels),
            servings: parseServings(recipe.servings),
            source: 'themealdb',
            isPublic: true,
            userId: null, // System recipe
          },
        });

        // Create RecipeIngredient records
        if (ingredientsData.length > 0) {
          await tx.recipeIngredient.createMany({
            data: ingredientsData.map((ing) => ({
              recipeId: createdRecipe.id,
              name: ing.name,
              measure: ing.measure,
              order: ing.order,
              itemType: ing.itemType,
              foodId: ing.foodId || null,
              foodCategoryId: ing.foodCategoryId || null,
            })),
          });
        }
      });

      created++;
      if (created % 50 === 0) {
        console.log(
          `   ⏳ ${created}/${recipesToProcess.length} recipes created...`,
        );
      }
    } catch (error) {
      console.error(
        `   ❌ Error seeding recipe ${recipe.externalId}: ${error}`,
      );
      errors++;
    }
  }

  console.log(`\n✅ TheMealDB seeding complete:`);
  console.log(`   📥 Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);

  return { created, skipped, errors };
}

/**
 * Standalone execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    dryRun: args.includes('--dry-run'),
    skipExisting: !args.includes('--force'),
  };

  // Parse --limit=N
  const limitArg = args.find((a) => a.startsWith('--limit='));
  if (limitArg) {
    options.limit = parseInt(limitArg.split('=')[1], 10);
  }

  const prisma = new PrismaClient();

  try {
    console.log('=====================================');
    console.log('🍽️  TheMealDB Recipe Seeding');
    console.log('=====================================');
    console.log(`Options: ${JSON.stringify(options)}`);
    console.log('');

    const result = await seedTheMealDbRecipes(prisma, options);

    if (result.errors > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  void main();
}
