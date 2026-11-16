import { calculateRecipeCarbonFootprint } from './calculate-recipe-carbon';
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
  carbonFootprint: number | null;
} {
  const weighed = weighIngredients(ingredients);
  return {
    nutritionalInfo: weighed && calculateRecipeNutrition(weighed),
    carbonFootprint: weighed && calculateRecipeCarbonFootprint(weighed),
  };
}
