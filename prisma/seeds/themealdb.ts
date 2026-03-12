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

import { Prisma, PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Single data file (build from CSVs with: npx ts-node scripts/build-themealdb-data.ts)
const DATA_DIR = path.join(__dirname, 'data');
const DATA_PATH = path.join(DATA_DIR, 'themealdb-data.json');

// Types (match themealdb-data.json)
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
 * Load single themealdb-data.json (build with: npx ts-node scripts/build-themealdb-data.ts)
 */
function loadThemealdbData(): ThemealdbData {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(
      `TheMealDB data file not found: ${DATA_PATH}. Run: npx ts-node scripts/build-themealdb-data.ts`,
    );
  }
  const content = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(content) as ThemealdbData;
}

/**
 * Build ingredient name -> mapping lookup from data.ingredientMappings
 */
function buildIngredientMapping(
  mappings: ThemealdbData['ingredientMappings'],
): Map<string, (typeof mappings)[0]> {
  const map = new Map<string, (typeof mappings)[0]>();
  for (const row of mappings) {
    map.set(row.ingredientName.toLowerCase().trim(), row);
  }
  return map;
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

  const data = loadThemealdbData();
  const recipes = data.recipes;
  const ingredientMapping = buildIngredientMapping(data.ingredientMappings);

  const ingredientCount = recipes.reduce((sum, r) => sum + r.ingredients.length, 0);
  console.log(`   📄 ${recipes.length} recipes`);
  console.log(`   🥕 ${ingredientCount} ingredient entries`);
  console.log(`   🔗 ${data.ingredientMappings.length} ingredient mappings`);
  const enrichedCount = recipes.filter((r) => r.nutritionalInfo != null || (r.allergens?.length ?? 0) > 0).length;
  if (enrichedCount > 0) {
    console.log(`   📊 ${enrichedCount} recipes with nutritionalInfo/allergens/sustainability`);
  }

  // Build lookup maps for linking ingredients
  const foodIdByBarcode = new Map<string, string>(); // barcode -> Food.id (for OFF mappings)
  const foodIdByName = new Map<string, string>(); // Food.name -> Food.id (fallback)
  const foodCategoryMap = new Map<number, string>(); // nevoCode -> FoodCategory.id
  const nevoCodeByName = new Map<string, number>(); // FoodCategory.foodName -> nevoCode

  if (!dryRun) {
    // Get Food records (OpenFoodFacts products) for OFF ingredient links (by barcode and name)
    const foods = await prisma.food.findMany({
      select: { id: true, name: true, barcode: true },
    });
    for (const food of foods) {
      if (food.barcode) foodIdByBarcode.set(food.barcode.trim(), food.id);
      foodIdByName.set(food.name.toLowerCase(), food.id);
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
      const ingredientsData: RecipeIngredientData[] = recipe.ingredients.map(
        (ing) => {
          const key = ing.name.toLowerCase().trim();
          const mapping = ingredientMapping.get(key);

          const ingredient: RecipeIngredientData = {
            name: ing.name,
            measure: ing.measure,
            order: ing.order,
            itemType: 'food_category',
          };

          if (mapping) {
            if (mapping.source === 'nevo') {
              let fcId: string | undefined;
              const nevoCode = mapping.sourceId
                ? parseInt(mapping.sourceId, 10)
                : NaN;
              if (!isNaN(nevoCode)) fcId = foodCategoryMap.get(nevoCode);
              // Fallback: resolve by foodName when sourceId missing (e.g. corrected NEVO row without code)
              if (!fcId && mapping.foodName) {
                const codeByName = nevoCodeByName.get(mapping.foodName.toLowerCase());
                if (codeByName != null) fcId = foodCategoryMap.get(codeByName);
              }
              if (fcId) {
                ingredient.foodCategoryId = fcId;
                ingredient.itemType = 'food_category';
              }
            } else if (
              (mapping.source === 'openfoodfacts' || mapping.source === 'off') &&
              mapping.sourceId
            ) {
              // OFF: sourceId is barcode; resolve Food by barcode first, then by name
              const foodId =
                foodIdByBarcode.get(mapping.sourceId.trim()) ??
                (mapping.foodName
                  ? foodIdByName.get(mapping.foodName.toLowerCase())
                  : undefined);
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
        const createdRecipe = await tx.recipe.create({
          data: {
            externalId: recipe.externalId,
            title: recipe.title,
            category: recipe.category || null,
            cuisineType: recipe.cuisineType || null,
            instructions: recipe.instructions || null,
            imageUrl: recipe.imageUrl || null,
            videoUrl: recipe.videoUrl || null,
            tags: recipe.tags ?? [],
            dietaryLabels: recipe.dietaryLabels ?? [],
            servings: recipe.servings ?? 4,
            allergens: recipe.allergens ?? [],
            nutritionalInfo:
              recipe.nutritionalInfo != null
                ? (recipe.nutritionalInfo as Prisma.InputJsonValue)
                : undefined,
            sustainabilityScore: recipe.sustainabilityScore ?? undefined,
            source: 'themealdb',
            isPublic: true,
            userId: null,
          },
        });

        // Create RecipeIngredient records
        if (ingredientsData.length > 0) {
          await tx.recipeIngredient.createMany({
            data: ingredientsData.map((ing) => ({
              recipeId: createdRecipe.id,
              name: ing.name,
              measure: ing.measure?.trim() ? ing.measure.trim() : null,
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
