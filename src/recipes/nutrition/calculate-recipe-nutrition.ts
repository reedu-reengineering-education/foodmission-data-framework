import { Unit } from '@prisma/client';
import {
  SPICE_PEPPER,
  WeighedAmount,
  parseQuantityUnit,
  quantityToGrams,
} from '../../common/utils/measure-parser';
import {
  NutrientValues,
  NutritionalInfo,
} from '../interfaces/nutrition.interface';

export const MAX_ESTIMATED_ENERGY_SHARE = 0.1;

const MAX_UNLINKED_CONDIMENT_GRAMS = 15;
const LOW_ENERGY_KCAL_PER_100G = 100;
const LOW_ENERGY_GUESS_GRAMS = 30;
const OIL_DRIZZLE_GRAMS = 5;
const FRESH_HERB_GRAMS = 2;
const PINCH_GRAMS = 1;

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

export const NUTRITION_INGREDIENT_SELECT = {
  name: true,
  measure: true,
  quantity: true,
  unit: true,
  foodProduct: { select: { ...NUTRITION_VALUE_SELECT, name: true } },
  genericFood: { select: { ...NUTRITION_VALUE_SELECT, foodName: true } },
} as const;

export interface NutritionIngredient {
  name: string;
  measure?: string | null;
  quantity?: number | null;
  unit?: Unit | null;
  foodProduct?: (NutrientSource & { name?: string }) | null;
  genericFood?: (NutrientSource & { foodName?: string }) | null;
}

const SERVED_ALONGSIDE = /\b(to serve|for serving|serve with)\b/i;

const FINISHING_TOUCH_GRAMS: [RegExp, number][] = [
  [/\b(pinch|drops?)\b/i, 0.5],
  [/\bdash\b/i, 1],
  [/\b(sprinkling|spinkling|sprinking|dusting|garnish)\b/i, 5],
  [/\b(greasing|drizzle)\b/i, 10],
  [/\bsplash\b/i, 15],
  [/\b(glaze|topping|top)\b/i, 20],
];

function finishingTouchGrams(measure: string): number | null {
  const match = FINISHING_TOUCH_GRAMS.find(([phrase]) => phrase.test(measure));
  return match ? match[1] : null;
}

const PLAIN_WATER = /^(?:cold |hot |boiling |warm )?waters?$/;

const FRESH_HERB =
  /\b(parsley|cilantro|coriander|basil|mint|dill|chives?|sage|herbs)\b/;

const CONDIMENT_NAME =
  /\b(salts?|peppercorns?|paprika|cumin|cinnamon|nutmeg|cloves?|allspice|cardamoms?|cardomom|caraway|fenugreek|sumac|annatto|juniper|turmeric|saffron|oregano|thyme|rosemary|marjoram|tarragon|seasonings?|spices?|masalas?|extracts?|vanilla|yeast|vinegar|worcestershire|tabasco|oil)\b|\bbay(?:\s+leaves?)?\b|\b(baking powder|bicarbonate of soda|baking soda|fish sauce|hot sauce|curry powder|cream of tartar|food colou?ring|chilli powder|chili powder|chilli flakes|chili flakes|pepper flakes|stock cubes?)\b|^peppers?$/;

function nutrientSource(
  ingredient: NutritionIngredient,
): NutrientSource | null {
  return ingredient.foodProduct || ingredient.genericFood || null;
}

function foodNames(ingredient: NutritionIngredient): string[] {
  return [
    ingredient.name,
    ingredient.genericFood?.foodName,
    ingredient.foodProduct?.name,
  ].filter((name): name is string => !!name);
}

function condimentGrams(ingredient: NutritionIngredient): number | null {
  for (const name of foodNames(ingredient)) {
    const grams = condimentGramsByName(name);
    if (grams != null) return grams;
  }
  return null;
}

function condimentGramsByName(name: string): number | null {
  const normalized = name.toLowerCase().trim();
  if (PLAIN_WATER.test(normalized)) return 0;
  if (FRESH_HERB.test(normalized)) return FRESH_HERB_GRAMS;
  if (!CONDIMENT_NAME.test(normalized) && !SPICE_PEPPER.test(normalized)) {
    return null;
  }
  return /\boil\b/.test(normalized) ? OIL_DRIZZLE_GRAMS : PINCH_GRAMS;
}

function measuredAmount(ingredient: NutritionIngredient): WeighedAmount | null {
  const parsed =
    ingredient.quantity != null && ingredient.unit != null
      ? { quantity: ingredient.quantity, unit: ingredient.unit }
      : ingredient.measure
        ? parseQuantityUnit(ingredient.measure)
        : null;
  return parsed
    ? quantityToGrams(parsed, foodNames(ingredient), ingredient.measure)
    : null;
}

function guessedGrams(
  ingredient: NutritionIngredient,
  source: NutrientSource | null,
): number | null {
  const { measure } = ingredient;
  if (measure && SERVED_ALONGSIDE.test(measure)) return 0;
  const finishingTouch = measure ? finishingTouchGrams(measure) : null;
  if (finishingTouch != null) return finishingTouch;
  const condiment = condimentGrams(ingredient);
  if (condiment != null) return condiment;
  const kcal = source?.energyKcal;
  return kcal != null && kcal <= LOW_ENERGY_KCAL_PER_100G
    ? LOW_ENERGY_GUESS_GRAMS
    : null;
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

function scaled(
  totals: Record<NutrientField, number>,
  factor: number,
): NutrientValues {
  return Object.fromEntries(
    NUTRIENT_FIELDS.map((field) => [field, round(totals[field] * factor)]),
  );
}

export function isUserProvidedNutrition(nutritionalInfo: unknown): boolean {
  return (
    typeof nutritionalInfo === 'object' &&
    nutritionalInfo !== null &&
    !('confidence' in nutritionalInfo)
  );
}

export function calculateRecipeNutrition(recipe: {
  ingredients: NutritionIngredient[];
}): NutritionalInfo | null {
  if (recipe.ingredients.length === 0) return null;

  const measured = emptyTotals();
  const estimated = emptyTotals();
  const missingIngredients: string[] = [];
  let measuredEnergyQuality = 0;
  let measuredRows = 0;
  let totalGrams = 0;

  for (const ingredient of recipe.ingredients) {
    const source = nutrientSource(ingredient);
    const amount = measuredAmount(ingredient);

    if (!amount) {
      const grams = guessedGrams(ingredient, source);
      if (grams == null) return null;
      missingIngredients.push(ingredient.name);
      totalGrams += grams;
      if (source) addNutrients(estimated, source, grams);
      continue;
    }

    totalGrams += amount.grams;

    if (!source) {
      const smallCondiment =
        condimentGrams(ingredient) != null &&
        amount.grams <= MAX_UNLINKED_CONDIMENT_GRAMS;
      if (!smallCondiment) return null;
      missingIngredients.push(ingredient.name);
      continue;
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

  const result: NutritionalInfo = scaled(totals, 1);
  result.missingIngredients = missingIngredients;
  result.confidence = round(
    totalEnergy > 0
      ? measuredEnergyQuality / totalEnergy
      : measuredRows > 0
        ? 1
        : 0.4,
    2,
  );

  if (totalGrams > 0) result.per100g = scaled(totals, 100 / totalGrams);

  return result;
}
