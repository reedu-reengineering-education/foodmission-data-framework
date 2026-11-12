import { Unit } from '@prisma/client';
import {
  parseQuantityUnit,
  quantityToGrams,
} from '../../common/utils/measure-parser';
import { NutritionalInfo } from '../interfaces/nutrition.interface';

/**
 * Share of recipe energy that may come from guessed condiment amounts.
 * Above this, the recipe has no nutritionalInfo.
 */
export const MAX_ESTIMATED_ENERGY_SHARE = 0.1;

export const NUTRITION_VALUE_SELECT = {
  energyKcal: true,
  energyKj: true,
  proteins: true,
  fat: true,
  saturatedFat: true,
  carbohydrates: true,
  sugars: true,
  fiber: true,
  sodium: true,
  vitaminA: true,
  vitaminC: true,
  vitaminD: true,
  calcium: true,
  iron: true,
  potassium: true,
} as const;

type NutrientField = keyof typeof NUTRITION_VALUE_SELECT;

export const NUTRIENT_FIELDS = Object.keys(
  NUTRITION_VALUE_SELECT,
) as NutrientField[];

export type NutrientSource = Partial<Record<NutrientField, number | null>>;

export interface NutritionIngredient {
  name: string;
  measure?: string | null;
  quantity?: number | null;
  unit?: Unit | null;
  foodProduct?: NutrientSource | null;
  genericFood?: NutrientSource | null;
}

const FRESH_HERB =
  /\b(parsley|cilantro|basil|mint|dill|chives?|sage|coriander leaves)\b/;

const VEGETABLE_PEPPER =
  /\b(bell|green|red|yellow|orange|sweet)\s+peppers?\b|\bchilli? peppers?\b/;

const CONDIMENT_NAME =
  /\b(salts?|peppers?|peppercorns?|paprika|cumin|cinnamon|nutmeg|cloves?|allspice|cardamoms?|turmeric|saffron|oregano|thyme|rosemary|parsley|cilantro|dill|mints?|sage|marjoram|tarragon|chives?|seasonings?|spices?|masalas?|extracts?|vanilla|yeast|vinegar|worcestershire|tabasco)\b|\bbay(?:\s+leaves?)?\b|\b(baking powder|bicarbonate of soda|baking soda|fish sauce|hot sauce|curry powder|chilli powder|chili powder|chilli flakes|chili flakes|stock cubes?)\b|\bwater\b|\boil\b/;

type Amount =
  | { kind: 'measured'; grams: number; quality: number }
  | { kind: 'estimated'; grams: number }
  | { kind: 'unknown' };

function nutrientSource(
  ingredient: NutritionIngredient,
): NutrientSource | null {
  return ingredient.foodProduct || ingredient.genericFood || null;
}

function isCondiment(name: string): boolean {
  const normalized = name.toLowerCase();
  if (/\bwater chestnuts?\b/.test(normalized)) return false;
  if (
    VEGETABLE_PEPPER.test(normalized) &&
    !/\b(flakes|powder|ground)\b/.test(normalized)
  ) {
    return false;
  }
  return CONDIMENT_NAME.test(normalized);
}

/** Grams for a vague condiment, or null when the name is not one. */
export function condimentGrams(name: string): number | null {
  if (!isCondiment(name)) return null;
  const normalized = name.toLowerCase().trim();
  if (/^(?:cold |hot |boiling |warm )?waters?$/.test(normalized)) return 0;
  if (/\boil\b/.test(normalized)) return 5;
  if (FRESH_HERB.test(normalized)) return 2;
  return 1;
}

function resolveAmount(ingredient: NutritionIngredient): Amount {
  const parsed =
    ingredient.quantity != null && ingredient.unit != null
      ? { quantity: ingredient.quantity, unit: ingredient.unit }
      : ingredient.measure
        ? parseQuantityUnit(ingredient.measure)
        : null;

  if (parsed) {
    const grams = quantityToGrams(parsed, ingredient.name, ingredient.measure);
    if (grams) {
      const quality =
        grams.confidence === 'high'
          ? 1
          : grams.confidence === 'medium'
            ? 0.7
            : 0.4;
      return { kind: 'measured', grams: grams.grams, quality };
    }
  }

  const estimated = condimentGrams(ingredient.name);
  if (estimated != null) return { kind: 'estimated', grams: estimated };
  return { kind: 'unknown' };
}

function emptyTotals(): Record<NutrientField, number> {
  return Object.fromEntries(
    NUTRIENT_FIELDS.map((field) => [field, 0]),
  ) as Record<NutrientField, number>;
}

function addNutrients(
  totals: Record<NutrientField, number>,
  source: NutrientSource,
  grams: number,
): number {
  const scale = grams / 100;
  for (const field of NUTRIENT_FIELDS) {
    const value = source[field];
    if (typeof value === 'number' && !Number.isNaN(value)) {
      totals[field] += value * scale;
    }
  }
  const kcal = source.energyKcal;
  return typeof kcal === 'number' && !Number.isNaN(kcal) ? kcal * scale : 0;
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Sum linked nutrients for one recipe.
 * Returns null when a non-condiment cannot be weighed, or when guessed
 * condiments are more than 10% of the energy. A partial sum is never returned.
 * An empty ingredient list returns an empty result, not null.
 */
export function calculateRecipeNutrition(recipe: {
  servings?: number | null;
  ingredients: NutritionIngredient[];
}): NutritionalInfo | null {
  if (recipe.ingredients.length === 0) {
    return { confidence: 0, missingIngredients: [] };
  }

  const measured = emptyTotals();
  const estimated = emptyTotals();
  const missingIngredients: string[] = [];
  let measuredEnergyQuality = 0;
  let measuredRows = 0;

  for (const ingredient of recipe.ingredients) {
    const amount = resolveAmount(ingredient);
    if (amount.kind === 'unknown') return null;

    const source = nutrientSource(ingredient);
    if (amount.kind === 'estimated') {
      missingIngredients.push(ingredient.name);
      if (source) addNutrients(estimated, source, amount.grams);
      continue;
    }

    if (!source) {
      // A teaspoon of an unmapped spice should not wipe the recipe.
      // A larger unlinked amount (oil by the cup) still withholds the total.
      if (isCondiment(ingredient.name) && amount.grams <= 15) {
        missingIngredients.push(ingredient.name);
        continue;
      }
      return null;
    }
    const energy = addNutrients(measured, source, amount.grams);
    measuredEnergyQuality += energy * amount.quality;
    measuredRows++;
  }

  const estimatedEnergy = estimated.energyKcal;
  const totalEnergy = measured.energyKcal + estimatedEnergy;
  if (
    totalEnergy > 0 &&
    estimatedEnergy / totalEnergy > MAX_ESTIMATED_ENERGY_SHARE
  ) {
    return null;
  }

  const totals = emptyTotals();
  for (const field of NUTRIENT_FIELDS) {
    totals[field] = measured[field] + estimated[field];
  }

  const result: NutritionalInfo = {};
  for (const field of NUTRIENT_FIELDS) {
    result[field] = round(totals[field]);
  }
  result.missingIngredients = missingIngredients;
  result.confidence = round(
    totalEnergy > 0
      ? measuredEnergyQuality / totalEnergy
      : measuredRows > 0
        ? 1
        : 0.4,
    2,
  );

  if (recipe.servings && recipe.servings > 0) {
    result.servings = recipe.servings;
    const perServing: NutritionalInfo = {};
    for (const field of NUTRIENT_FIELDS) {
      perServing[field] = round(totals[field] / recipe.servings);
    }
    result.perServing = perServing;
  }

  return result;
}
