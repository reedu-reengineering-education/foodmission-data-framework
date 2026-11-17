import {
  EnvironmentalImpact,
  calculateRecipeImpact,
} from './calculate-recipe-impact';
import {
  NutritionIngredient,
  NutritionalInfo,
  calculateRecipeNutrition,
  weighIngredients,
} from './calculate-recipe-nutrition';

export interface RecipeEstimates {
  nutritionalInfo: NutritionalInfo | null;
  environmentalImpact: EnvironmentalImpact | null;
}

export function estimateRecipe({
  ingredients,
  servings,
}: {
  ingredients: NutritionIngredient[];
  servings?: number | null;
}): RecipeEstimates {
  const weighed = weighIngredients(ingredients);
  return {
    nutritionalInfo: weighed && calculateRecipeNutrition(weighed),
    environmentalImpact: weighed && calculateRecipeImpact(weighed, servings),
  };
}
