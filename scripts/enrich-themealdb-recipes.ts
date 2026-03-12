/**
 * TheMealDB Recipe Enrichment Script
 *
 * Enriches recipes with aggregated nutritional data from NEVO ingredient mappings.
 *
 * Process:
 * 1. Load recipes from themealdb-recipes.csv
 * 2. Load ingredients from themealdb-ingredients.csv
 * 3. Load ingredient-to-food mappings from ingredient-food-mapping.csv
 * 4. For each recipe:
 *    - Sum nutritional values across all mapped ingredients
 *    - Detect allergens from ingredient names
 *    - Calculate average sustainability score (placeholder)
 * 5. Output enriched-recipes.csv
 *
 * Usage: npx ts-node scripts/enrich-themealdb-recipes.ts
 */

import fs from 'fs';
import path from 'path';
import { csvToObjects, objectsToCsv } from './parse-csv';

// Paths
const DATA_DIR = path.join(__dirname, '../prisma/seeds/data');
const RECIPES_PATH = path.join(DATA_DIR, 'themealdb-recipes.csv');
const INGREDIENTS_PATH = path.join(DATA_DIR, 'themealdb-ingredients.csv');
const MAPPING_PATH = path.join(DATA_DIR, 'ingredient-food-mapping.csv');
const ENRICHED_PATH = path.join(DATA_DIR, 'enriched-recipes.csv');

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

interface NutritionalInfo {
  energyKcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

// Common allergens detection based on ingredient names
// Following EU allergen labeling requirements
const ALLERGEN_PATTERNS: Record<string, RegExp> = {
  gluten: /\b(wheat|flour|bread|pasta|noodle|barley|rye|oat|spelt|semolina|couscous|bulgur)\b/i,
  milk: /\b(milk|cream|butter|cheese|yogurt|yoghurt|ghee|paneer|mascarpone|ricotta|mozzarella|parmesan|cheddar|feta)\b/i,
  eggs: /\b(egg|eggs|mayonnaise|meringue)\b/i,
  fish: /\b(fish|salmon|tuna|cod|anchovy|sardine|mackerel|haddock|trout|bass|tilapia)\b/i,
  crustaceans: /\b(shrimp|prawn|crab|lobster|crayfish|crawfish)\b/i,
  molluscs: /\b(mussel|clam|oyster|scallop|squid|octopus|calamari|snail)\b/i,
  nuts: /\b(almond|walnut|pecan|cashew|pistachio|hazelnut|macadamia|brazil\s*nut|chestnut)\b/i,
  peanuts: /\b(peanut|groundnut)\b/i,
  soy: /\b(soy|soya|tofu|tempeh|edamame|miso)\b/i,
  celery: /\b(celery|celeriac)\b/i,
  mustard: /\b(mustard)\b/i,
  sesame: /\b(sesame|tahini)\b/i,
  sulphites: /\b(wine|dried\s*(fruit|apricot|raisin))\b/i,
  lupin: /\b(lupin)\b/i,
};

/**
 * Load and parse a CSV file
 */
function loadCsv<T = Record<string, string>>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return csvToObjects(content) as unknown as T[];
}

/**
 * Build ingredient-to-food mapping from CSV
 */
function buildIngredientMapping(mappings: MappingRow[]): Map<string, MappingRow> {
  const map = new Map<string, MappingRow>();
  for (const row of mappings) {
    // Only include rows with actual mapping (not 'none')
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
 * Detect allergens from ingredient names
 */
function detectAllergens(ingredientNames: string[]): string[] {
  const detectedAllergens = new Set<string>();

  for (const name of ingredientNames) {
    for (const [allergen, pattern] of Object.entries(ALLERGEN_PATTERNS)) {
      if (pattern.test(name)) {
        detectedAllergens.add(allergen);
      }
    }
  }

  return Array.from(detectedAllergens).sort();
}

/**
 * Parse a numeric value from CSV, returning 0 if invalid
 */
function parseNum(val: string | undefined): number {
  if (!val || val.trim() === '') return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

/**
 * Calculate aggregated nutritional info for a recipe
 * Note: This is a simplified calculation - real-world would need portion sizes
 */
function calculateNutrition(
  ingredients: IngredientRow[],
  mapping: Map<string, MappingRow>,
): { nutrition: NutritionalInfo; mappedCount: number; totalCount: number } {
  const nutrition: NutritionalInfo = {
    energyKcal: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
  };

  let mappedCount = 0;
  const totalCount = ingredients.length;

  for (const ing of ingredients) {
    const key = ing.ingredientName.toLowerCase().trim();
    const mappedFood = mapping.get(key);

    if (mappedFood) {
      mappedCount++;
      // Add nutrition values (per 100g from NEVO)
      // In a real system, we'd parse the measure and calculate actual amounts
      // For now, we estimate ~50g average per ingredient for a rough total
      const portionFactor = 0.5; // 50g average portion assumption
      nutrition.energyKcal += parseNum(mappedFood.energyKcal) * portionFactor;
      nutrition.protein += parseNum(mappedFood.protein) * portionFactor;
      nutrition.fat += parseNum(mappedFood.fat) * portionFactor;
      nutrition.carbs += parseNum(mappedFood.carbs) * portionFactor;
      nutrition.fiber += parseNum(mappedFood.fiber) * portionFactor;
    }
  }

  // Round to 1 decimal place
  nutrition.energyKcal = Math.round(nutrition.energyKcal * 10) / 10;
  nutrition.protein = Math.round(nutrition.protein * 10) / 10;
  nutrition.fat = Math.round(nutrition.fat * 10) / 10;
  nutrition.carbs = Math.round(nutrition.carbs * 10) / 10;
  nutrition.fiber = Math.round(nutrition.fiber * 10) / 10;

  return { nutrition, mappedCount, totalCount };
}

/**
 * Calculate sustainability score
 * NEVO doesn't have ecoscore, so we use a placeholder based on category
 */
function calculateSustainability(category: string): number {
  // Rough sustainability scoring by category
  // Plant-based categories score higher
  const categoryScores: Record<string, number> = {
    Vegan: 0.9,
    Vegetarian: 0.8,
    Side: 0.7,
    Pasta: 0.7,
    Starter: 0.6,
    Breakfast: 0.6,
    Dessert: 0.5,
    Miscellaneous: 0.5,
    Chicken: 0.5,
    Pork: 0.4,
    Beef: 0.3,
    Lamb: 0.3,
    Goat: 0.3,
    Seafood: 0.4,
  };

  return categoryScores[category] ?? 0.5;
}

/**
 * Main enrichment function
 */
function enrichRecipes(): void {
  console.log('🔬 Loading data files...');

  // Load CSVs
  const recipes = loadCsv<RecipeRow>(RECIPES_PATH);
  const ingredients = loadCsv<IngredientRow>(INGREDIENTS_PATH);
  const mappings = loadCsv<MappingRow>(MAPPING_PATH);

  console.log(`   📄 ${recipes.length} recipes`);
  console.log(`   🥕 ${ingredients.length} ingredient entries`);
  console.log(`   🔗 ${mappings.length} ingredient mappings`);

  // Build lookup structures
  const ingredientMapping = buildIngredientMapping(mappings);
  const ingredientsByRecipe = groupIngredientsByRecipe(ingredients);

  console.log(`   ✅ ${ingredientMapping.size} ingredients with food mappings`);

  // Enrich each recipe
  const enrichedRecipes: Record<string, unknown>[] = [];
  let totalMappedIngredients = 0;
  let totalIngredients = 0;

  console.log('\n🧪 Enriching recipes...');

  for (const recipe of recipes) {
    const recipeIngredients = ingredientsByRecipe.get(recipe.externalId) || [];
    const ingredientNames = recipeIngredients.map((i) => i.ingredientName);

    // Calculate aggregated nutrition
    const { nutrition, mappedCount, totalCount } = calculateNutrition(
      recipeIngredients,
      ingredientMapping,
    );
    totalMappedIngredients += mappedCount;
    totalIngredients += totalCount;

    // Detect allergens from ingredient names
    const allergens = detectAllergens(ingredientNames);

    // Calculate sustainability score
    const sustainabilityScore = calculateSustainability(recipe.category);

    // Build enriched recipe row
    enrichedRecipes.push({
      externalId: recipe.externalId,
      title: recipe.title,
      category: recipe.category,
      cuisineType: recipe.cuisineType,
      instructions: recipe.instructions,
      imageUrl: recipe.imageUrl,
      videoUrl: recipe.videoUrl,
      tags: recipe.tags,
      dietaryLabels: recipe.dietaryLabels,
      servings: recipe.servings,
      // Enriched fields
      nutritionalInfo: JSON.stringify(nutrition),
      allergens: allergens.join(','),
      sustainabilityScore: sustainabilityScore.toFixed(2),
      ingredientCount: totalCount,
      mappedIngredientCount: mappedCount,
    });
  }

  // Write output
  const outputCsv = objectsToCsv(enrichedRecipes as Record<string, unknown>[]);
  fs.writeFileSync(ENRICHED_PATH, outputCsv);

  // Summary
  const mappingRate =
    totalIngredients > 0
      ? Math.round((totalMappedIngredients / totalIngredients) * 100)
      : 0;

  console.log(`\n✅ Enrichment complete!`);
  console.log(`   📊 ${enrichedRecipes.length} recipes enriched`);
  console.log(
    `   🥕 ${totalMappedIngredients}/${totalIngredients} ingredients mapped (${mappingRate}%)`,
  );
  console.log(`   📄 Output: ${ENRICHED_PATH}`);
}

// Run
enrichRecipes();

