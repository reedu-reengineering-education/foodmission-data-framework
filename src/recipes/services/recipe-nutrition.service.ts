import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NutritionalInfo } from '../interfaces/nutrition.interface';
import {
  calculateRecipeNutrition,
  NUTRITION_INGREDIENT_SELECT,
} from '../nutrition/calculate-recipe-nutrition';

@Injectable()
export class RecipeNutritionService {
  constructor(private readonly prisma: PrismaService) {}

  private findRecipeWithNutrientSources(recipeId: string) {
    return this.prisma.recipe.findUnique({
      where: { id: recipeId },
      select: {
        ingredients: {
          orderBy: { order: 'asc' },
          select: NUTRITION_INGREDIENT_SELECT,
        },
      },
    });
  }

  async calculateNutrition(recipeId: string): Promise<NutritionalInfo | null> {
    const recipe = await this.findRecipeWithNutrientSources(recipeId);
    return recipe ? calculateRecipeNutrition(recipe) : null;
  }

  async updateRecipeNutrition(
    recipeId: string,
  ): Promise<NutritionalInfo | null> {
    const recipe = await this.findRecipeWithNutrientSources(recipeId);
    if (!recipe) return null;

    const nutrition = calculateRecipeNutrition(recipe);
    await this.prisma.recipe.update({
      where: { id: recipeId },
      data: {
        nutritionalInfo:
          nutrition === null
            ? Prisma.JsonNull
            : (nutrition as unknown as Prisma.InputJsonValue),
      },
    });
    return nutrition;
  }
}
