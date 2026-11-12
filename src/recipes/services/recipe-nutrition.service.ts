import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NutritionalInfo } from '../interfaces/nutrition.interface';
import {
  calculateRecipeNutrition,
  NUTRITION_VALUE_SELECT,
} from '../nutrition/calculate-recipe-nutrition';

const FOOD_NUTRITION_SELECT = {
  id: true,
  name: true,
  ...NUTRITION_VALUE_SELECT,
} as const;

const GENERIC_FOOD_NUTRITION_SELECT = {
  id: true,
  foodName: true,
  ...NUTRITION_VALUE_SELECT,
} as const;

/**
 * Aggregates recipe nutrition from linked foods.
 * MealDB totals are filled by the nutrition backfill. This service is the
 * same calculation, for one recipe. See docs/RECIPE_NUTRITION.md.
 */
@Injectable()
export class RecipeNutritionService {
  private readonly logger = new Logger(RecipeNutritionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Null when the recipe does not exist, or when the totals would be
   * misleading (an unweighed non-condiment, or condiment guesses over 10%
   * of energy). An empty ingredient list returns an empty result.
   */
  async calculateNutrition(recipeId: string): Promise<NutritionalInfo | null> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          orderBy: { order: 'asc' },
          include: {
            foodProduct: { select: FOOD_NUTRITION_SELECT },
            genericFood: { select: GENERIC_FOOD_NUTRITION_SELECT },
          },
        },
      },
    });

    if (!recipe) return null;
    return calculateRecipeNutrition(recipe);
  }

  /**
   * Persist nutrition, or clear it when the recipe cannot be totalled.
   * Returns null when the recipe does not exist or the total was refused.
   */
  async updateRecipeNutrition(
    recipeId: string,
  ): Promise<NutritionalInfo | null> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true },
    });
    if (!recipe) return null;

    const nutrition = await this.calculateNutrition(recipeId);
    await this.prisma.recipe.update({
      where: { id: recipeId },
      data: {
        nutritionalInfo:
          nutrition === null
            ? Prisma.JsonNull
            : (nutrition as unknown as Prisma.InputJsonValue),
      },
    });

    this.logger.log(
      nutrition
        ? `Updated nutrition for recipe ${recipeId} (confidence: ${nutrition.confidence})`
        : `Cleared nutrition for recipe ${recipeId}`,
    );
    return nutrition;
  }
}
