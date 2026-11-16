import {
  NutritionIngredient,
  dishGrams,
  sum,
  weighIngredients,
} from './calculate-recipe-nutrition';

export function calculateRecipeCarbonFootprint({
  ingredients,
}: {
  ingredients: NutritionIngredient[];
}): number | null {
  const weighed = weighIngredients(ingredients);
  if (!weighed) return null;

  const counted = weighed.filter(({ grams, source }) => grams > 0 && source);
  const co2PerKg = counted.map(
    ({ ingredient }) => ingredient.genericFood?.carbonFootprint,
  );
  if (
    counted.length === 0 ||
    co2PerKg.some((value) => typeof value !== 'number')
  ) {
    return null;
  }

  const totalKgCo2 = sum(
    counted.map(({ grams }, i) => (co2PerKg[i]! * grams) / 1000),
  );
  return Math.round((totalKgCo2 / (dishGrams(weighed) / 1000)) * 100) / 100;
}
