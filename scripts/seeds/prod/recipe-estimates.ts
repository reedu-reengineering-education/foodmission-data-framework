import { PrismaClient, RecipeOrigin } from '@prisma/client';
import {
  ESTIMATE_INGREDIENT_SELECT,
  toJsonColumn,
} from '../../../src/recipes/nutrition/calculate-recipe-nutrition';
import { estimateRecipe } from '../../../src/recipes/nutrition/estimate-recipe';

export async function recalculateRecipeEstimates(
  prisma: PrismaClient,
): Promise<void> {
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      origin: true,
      ingredients: {
        orderBy: { order: 'asc' },
        select: ESTIMATE_INGREDIENT_SELECT,
      },
    },
  });

  let seeded = 0;
  let withNutrition = 0;
  let withImpact = 0;
  for (const recipe of recipes) {
    const isSeeded = recipe.origin === RecipeOrigin.THEMEALDB;
    const { nutritionalInfo, environmentalImpact } = estimateRecipe(recipe);
    if (isSeeded) seeded++;
    if (isSeeded && nutritionalInfo) withNutrition++;
    if (environmentalImpact) withImpact++;
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: {
        environmentalImpact: toJsonColumn(environmentalImpact),
        ...(isSeeded && { nutritionalInfo: toJsonColumn(nutritionalInfo) }),
      },
    });
  }

  console.log(
    `   🥗 Recipe nutrition: stored ${withNutrition}, withheld ${seeded - withNutrition}`,
  );
  console.log(
    `   🌍 Recipe environmental impact: stored ${withImpact}, withheld ${recipes.length - withImpact}`,
  );
}
