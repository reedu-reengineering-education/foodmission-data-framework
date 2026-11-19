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

export function estimateRecipe({
  ingredients,
}: {
  ingredients: NutritionIngredient[];
}): {
  nutritionalInfo: NutritionalInfo | null;
  environmentalImpact: EnvironmentalImpact | null;
} {
  const weighed = weighIngredients(ingredients);
  return {
    nutritionalInfo: weighed && calculateRecipeNutrition(weighed),
    environmentalImpact: weighed && calculateRecipeImpact(weighed),
  };
}
