import { WeighedIngredient, dishGrams } from './calculate-recipe-nutrition';

const MIN_COVERAGE = 0.95;

export interface EnvironmentalImpact {
  perKg: { co2: number; efScoreMpt: number };
  coverage: number;
  dqr: number;
  source: string;
}

const round = (value: number, decimals: number) =>
  Math.round(value * 10 ** decimals) / 10 ** decimals;

export function calculateRecipeImpact(
  weighed: WeighedIngredient[],
): EnvironmentalImpact | null {
  let countedGrams = 0;
  let knownGrams = 0;
  let co2 = 0;
  let efScore = 0;
  let dqrGrams = 0;
  const versions = new Set<string>();

  for (const { ingredient, grams } of weighed) {
    if (grams === 0) continue;
    countedGrams += grams;
    const food =
      ingredient.foodProduct?.agribalyseFood ??
      ingredient.genericFood?.agribalyseFood;
    if (!food) continue;
    knownGrams += grams;
    co2 += (food.co2PerKg * grams) / 1000;
    efScore += (food.efScorePerKg * grams) / 1000;
    dqrGrams += food.dqr * grams;
    versions.add(food.version);
  }

  const coverage = countedGrams > 0 ? knownGrams / countedGrams : 0;
  if (coverage < MIN_COVERAGE) return null;

  const dishKg = dishGrams(weighed) / 1000;
  return {
    perKg: {
      co2: round(co2 / dishKg, 3),
      efScoreMpt: round(efScore / dishKg, 3),
    },
    coverage: round(coverage, 3),
    dqr: round(dqrGrams / knownGrams, 2),
    source: `AGRIBALYSE ${[...versions].sort().join(', ')}`,
  };
}
