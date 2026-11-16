import { Unit } from '@prisma/client';
import {
  SPICE_PEPPER,
  parseQuantityUnit,
  quantityToGrams,
} from '../../common/utils/measure-parser';
import { NutritionalInfo } from '../interfaces/nutrition.interface';

const MAX_ESTIMATED_ENERGY_SHARE = 0.1;

const MAX_UNLINKED_CONDIMENT_GRAMS = 15;
const LOW_ENERGY_KCAL_PER_100G = 100;
const LOW_ENERGY_GUESS_GRAMS = 30;
const OIL_DRIZZLE_GRAMS = 5;
const FRESH_HERB_GRAMS = 2;
const PINCH_GRAMS = 1;

const NUTRITION_VALUE_SELECT = {
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

export type NutrientField = keyof typeof NUTRITION_VALUE_SELECT;

const NUTRIENT_FIELDS = Object.keys(NUTRITION_VALUE_SELECT) as NutrientField[];

type NutrientSource = Partial<Record<NutrientField, number | null>>;

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

const ABSORBED_WATER_PER_GRAM: [RegExp, number][] = [
  [/^pasta\b.*\braw\b/i, 1.3],
  [/^rice\b.*\braw\b/i, 1.8],
  [/^couscous\b.*\bunprepared\b/i, 1.5],
  [/^(bulgur|quinoa)\b.*\braw\b/i, 1.7],
  [/^lentils\b.*\bdried\b/i, 1.5],
];

const COOKING_LIQUID =
  /^(water|stock|milk|buttermilk|cream|creme fraiche|coconut milk|drink soya|wine|sherry|beer|cider|juice|tomatoes tinned)\b/i;

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

const CONDIMENT_WORDS = [
  'salts?',
  'peppercorns?',
  'pepper flakes',
  'paprika',
  'cumin',
  'cinnamon',
  'nutmeg',
  'cloves?',
  'allspice',
  'cardamoms?',
  'cardomom',
  'caraway',
  'fenugreek',
  'sumac',
  'annatto',
  'juniper',
  'turmeric',
  'saffron',
  'oregano',
  'thyme',
  'rosemary',
  'marjoram',
  'tarragon',
  'bay',
  'seasonings?',
  'spices?',
  'masalas?',
  'curry powder',
  'chill?i powder',
  'chill?i flakes',
  'extracts?',
  'vanilla',
  'yeast',
  'baking powder',
  'baking soda',
  'bicarbonate of soda',
  'cream of tartar',
  'food colou?ring',
  'stock cubes?',
  'vinegar',
  'worcestershire',
  'tabasco',
  'fish sauce',
  'hot sauce',
  'oil',
];

const CONDIMENT_NAME = new RegExp(
  `\\b(${CONDIMENT_WORDS.join('|')})\\b|^peppers?$`,
);

function nutrientSource(
  ingredient: NutritionIngredient,
): NutrientSource | null {
  return (
    [ingredient.foodProduct, ingredient.genericFood].find(
      (food) => typeof food?.energyKcal === 'number',
    ) ?? null
  );
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

function measuredGrams(ingredient: NutritionIngredient): number | null {
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

function absorbedWaterGrams(
  ingredient: NutritionIngredient,
  grams: number,
): number {
  const food = ingredient.genericFood?.foodName ?? '';
  const match = ABSORBED_WATER_PER_GRAM.find(([dryStaple]) =>
    dryStaple.test(food),
  );
  return match ? grams * match[1] : 0;
}

function isCookingLiquid(ingredient: NutritionIngredient): boolean {
  return COOKING_LIQUID.test(ingredient.genericFood?.foodName ?? '');
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
  unknownFields: Set<NutrientField>,
  source: NutrientSource,
  grams: number,
): void {
  if (grams === 0) return;
  for (const field of NUTRIENT_FIELDS) {
    const value = source[field];
    if (typeof value === 'number' && !Number.isNaN(value)) {
      totals[field] += (value * grams) / 100;
    } else {
      unknownFields.add(field);
    }
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function isUserProvidedNutrition(nutritionalInfo: unknown): boolean {
  return (
    typeof nutritionalInfo === 'object' &&
    nutritionalInfo !== null &&
    (nutritionalInfo as NutritionalInfo).estimated !== true
  );
}

export function calculateRecipeNutrition(recipe: {
  ingredients: NutritionIngredient[];
}): NutritionalInfo | null {
  if (recipe.ingredients.length === 0) return null;

  const totals = emptyTotals();
  const unknownFields = new Set<NutrientField>();
  const missingIngredients: string[] = [];
  let estimatedKcal = 0;
  let totalGrams = 0;
  let waterToAbsorb = 0;
  let cookingLiquid = 0;

  for (const ingredient of recipe.ingredients) {
    const source = nutrientSource(ingredient);
    const measuredWeight = measuredGrams(ingredient);

    if (measuredWeight == null) {
      const grams = guessedGrams(ingredient, source);
      if (grams == null) return null;
      missingIngredients.push(ingredient.name);
      totalGrams += grams;
      if (source) {
        addNutrients(totals, unknownFields, source, grams);
        estimatedKcal += ((source.energyKcal ?? 0) * grams) / 100;
      }
      continue;
    }

    totalGrams += measuredWeight;
    waterToAbsorb += absorbedWaterGrams(ingredient, measuredWeight);
    if (isCookingLiquid(ingredient)) cookingLiquid += measuredWeight;

    if (!source) {
      const smallCondiment =
        condimentGrams(ingredient) != null &&
        measuredWeight <= MAX_UNLINKED_CONDIMENT_GRAMS;
      if (!smallCondiment) return null;
      missingIngredients.push(ingredient.name);
      continue;
    }

    addNutrients(totals, unknownFields, source, measuredWeight);
  }

  if (
    totals.energyKcal > 0 &&
    estimatedKcal / totals.energyKcal > MAX_ESTIMATED_ENERGY_SHARE
  ) {
    return null;
  }

  const dishGrams = totalGrams + Math.max(0, waterToAbsorb - cookingLiquid);
  if (dishGrams <= 0) return null;

  return {
    per100g: Object.fromEntries(
      NUTRIENT_FIELDS.filter((field) => !unknownFields.has(field)).map(
        (field) => [field, round((totals[field] * 100) / dishGrams)],
      ),
    ),
    estimated: true,
    missingIngredients,
  };
}
