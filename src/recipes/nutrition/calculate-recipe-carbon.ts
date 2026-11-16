import { WeighedIngredient, dishGrams } from './calculate-recipe-nutrition';

export function calculateRecipeCarbonFootprint(
  weighed: WeighedIngredient[],
): number | null {
  let gramsCo2 = 0;
  for (const { ingredient, source, grams } of weighed) {
    if (grams === 0 || !source) continue;
    const co2PerKg = ingredient.genericFood?.carbonFootprint;
    if (co2PerKg == null) return null;
    gramsCo2 += co2PerKg * grams;
  }
  if (gramsCo2 === 0) return null;

  return Math.round((gramsCo2 / dishGrams(weighed)) * 100) / 100;
}
