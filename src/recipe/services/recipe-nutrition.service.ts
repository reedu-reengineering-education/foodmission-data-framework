import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { parseMeasure } from '../../common/utils/measure-parser';
import { NutritionalInfo } from '../interfaces/nutrition.interface';

/**
 * Nutrient fields to aggregate from Food and FoodCategory models.
 * These fields are present on both models (per 100g basis).
 */
const NUTRIENT_FIELDS = [
  'energyKcal',
  'energyKj',
  'proteins',
  'fat',
  'saturatedFat',
  'transFat',
  'carbohydrates',
  'sugars',
  'fiber',
  'sodium',
  'salt',
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'calcium',
  'iron',
  'potassium',
] as const;

/**
 * Select fields for Food model nutrition data.
 */
const FOOD_NUTRITION_SELECT = {
  id: true,
  name: true,
  energyKcal: true,
  energyKj: true,
  proteins: true,
  fat: true,
  saturatedFat: true,
  transFat: true,
  carbohydrates: true,
  sugars: true,
  fiber: true,
  sodium: true,
  salt: true,
  vitaminA: true,
  vitaminC: true,
  vitaminD: true,
  calcium: true,
  iron: true,
  potassium: true,
} as const;

/**
 * Select fields for FoodCategory model nutrition data.
 */
const FOOD_CATEGORY_NUTRITION_SELECT = {
  id: true,
  foodName: true,
  energyKcal: true,
  energyKj: true,
  proteins: true,
  fat: true,
  saturatedFat: true,
  transFat: true,
  carbohydrates: true,
  sugars: true,
  fiber: true,
  sodium: true,
  salt: true,
  vitaminA: true,
  vitaminC: true,
  vitaminD: true,
  calcium: true,
  iron: true,
  potassium: true,
} as const;

/**
 * Service for calculating aggregated nutritional information for recipes.
 *
 * Aggregates nutrient values from linked Food (OpenFoodFacts) and
 * FoodCategory (NEVO) sources, scaling by ingredient weight.
 */
@Injectable()
export class RecipeNutritionService {
  private readonly logger = new Logger(RecipeNutritionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate aggregated nutrition for a recipe by summing ingredient nutrients.
   *
   * Algorithm:
   * 1. Fetch recipe with ingredients + linked Food/FoodCategory nutrient data
   * 2. For each ingredient:
   *    a. Parse measure string to grams using parseMeasure()
   *    b. Get nutrient source (Food or FoodCategory)
   *    c. Scale nutrients: (nutrientPer100g * grams / 100)
   * 3. Sum all scaled nutrients
   * 4. Calculate per-serving if recipe.servings is set
   * 5. Track confidence and missing ingredients
   */
  async calculateNutrition(recipeId: string): Promise<NutritionalInfo> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          orderBy: { order: 'asc' },
          include: {
            food: { select: FOOD_NUTRITION_SELECT },
            foodCategory: { select: FOOD_CATEGORY_NUTRITION_SELECT },
          },
        },
      },
    });

    if (!recipe) {
      return { confidence: 0, missingIngredients: [] };
    }

    // Initialize aggregated nutrients
    const totals: Record<string, number> = {};
    for (const field of NUTRIENT_FIELDS) {
      totals[field] = 0;
    }

    const missingIngredients: string[] = [];
    let parsedCount = 0;
    let confidenceSum = 0;

    for (const ingredient of recipe.ingredients) {
      // Get nutrient source (prefer Food over FoodCategory)
      const nutrientSource = ingredient.food || ingredient.foodCategory;

      if (!nutrientSource) {
        missingIngredients.push(ingredient.name);
        continue;
      }

      // Parse measure to grams
      const parsed = parseMeasure(
        ingredient.measure || '100g',
        ingredient.name,
      );

      // Skip if unparseable (unknown confidence = qualitative like "to taste")
      if (parsed.confidence === 'unknown') {
        this.logger.debug(
          `Skipping qualitative measure: ${ingredient.name} (${ingredient.measure})`,
        );
        continue;
      }

      // Scale and sum nutrients
      const scaleFactor = parsed.grams / 100;
      for (const field of NUTRIENT_FIELDS) {
        const value = (nutrientSource as Record<string, unknown>)[field];
        if (typeof value === 'number' && !isNaN(value)) {
          totals[field] += value * scaleFactor;
        }
      }

      parsedCount++;
      confidenceSum +=
        parsed.confidence === 'high'
          ? 1
          : parsed.confidence === 'medium'
            ? 0.7
            : 0.4;
    }

    // Calculate overall confidence
    // confidence = (% parsed) × (avg parse quality)
    const totalIngredients = recipe.ingredients.length;
    const confidence =
      totalIngredients > 0
        ? (parsedCount / totalIngredients) *
          (confidenceSum / Math.max(parsedCount, 1))
        : 0;

    // Build result with rounded values
    const result: NutritionalInfo = {
      energyKcal: round(totals.energyKcal),
      energyKj: round(totals.energyKj),
      proteins: round(totals.proteins),
      fat: round(totals.fat),
      saturatedFat: round(totals.saturatedFat),
      carbohydrates: round(totals.carbohydrates),
      sugars: round(totals.sugars),
      fiber: round(totals.fiber),
      sodium: round(totals.sodium),
      confidence: round(confidence, 2),
      missingIngredients,
    };

    // Calculate per-serving if servings is defined
    if (recipe.servings && recipe.servings > 0) {
      result.servings = recipe.servings;
      result.perServing = {
        energyKcal: round(totals.energyKcal / recipe.servings),
        energyKj: round(totals.energyKj / recipe.servings),
        proteins: round(totals.proteins / recipe.servings),
        fat: round(totals.fat / recipe.servings),
        saturatedFat: round(totals.saturatedFat / recipe.servings),
        carbohydrates: round(totals.carbohydrates / recipe.servings),
        sugars: round(totals.sugars / recipe.servings),
        fiber: round(totals.fiber / recipe.servings),
        sodium: round(totals.sodium / recipe.servings),
      };
    }

    return result;
  }

  /**
   * Calculate and persist nutrition to the recipe's nutritionalInfo field.
   */
  async updateRecipeNutrition(recipeId: string): Promise<NutritionalInfo> {
    const nutrition = await this.calculateNutrition(recipeId);

    await this.prisma.recipe.update({
      where: { id: recipeId },
      data: { nutritionalInfo: nutrition as unknown as Prisma.InputJsonValue },
    });

    this.logger.log(
      `Updated nutrition for recipe ${recipeId} (confidence: ${nutrition.confidence})`,
    );
    return nutrition;
  }
}

/**
 * Round a number to the specified decimal places.
 */
function round(value: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
