import { Prisma, Unit } from '@prisma/client';
import {
  SPICE_PEPPER,
  WordTable,
  lookup,
  quantityToGrams,
  wordTable,
} from './ingredient-grams';

const MAX_ESTIMATED_ENERGY_SHARE = 0.1;
const MAX_UNLINKED_GRAMS = 15;
const LOW_ENERGY_KCAL_PER_100G = 50;
const LOW_ENERGY_GUESS_GRAMS = 30;
const CONDIMENT_GRAMS = 1;

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

type NutrientField = keyof typeof NUTRITION_VALUE_SELECT;

const NUTRIENT_FIELDS = Object.keys(NUTRITION_VALUE_SELECT) as NutrientField[];

type NutrientSource = Partial<Record<NutrientField, number | null>>;

export interface NutritionalInfo {
  per100g: Partial<Record<NutrientField, number>>;
  estimated: true;
  missingIngredients: string[];
}

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

const ABSORBED_WATER_PER_GRAM: WordTable = [
  [/^pasta\b.*\braw\b/i, 1.3],
  [/^rice\b.*\braw\b/i, 1.8],
  [/^couscous\b.*\bunprepared\b/i, 1.5],
  [/^(bulgur|quinoa)\b.*\braw\b/i, 1.7],
  [/^lentils\b.*\bdried\b/i, 1.5],
];

const COOKING_LIQUID =
  /^(water|stock|milk|buttermilk|cream|creme fraiche|coconut milk|drink soya|wine|sherry|beer|cider|juice|tomatoes tinned)\b/i;

const PHRASE_GRAMS: WordTable = [
  [/\b(to serve|for serving|serve with)\b/i, 0],
  [/\b(pinch|drops?)\b/i, 0.5],
  [/\bdash\b/i, 1],
  [/\b(sprinkling|spinkling|sprinking|dusting|garnish)\b/i, 5],
  [/\b(greasing|drizzle)\b/i, 10],
  [/\bsplash\b/i, 15],
  [/\b(glaze|topping|top)\b/i, 20],
];

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
  'ginger',
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
  'water',
  'parsley',
  'cilantro',
  'coriander',
  'basil',
  'mint',
  'dill',
  'chives?',
  'sage',
  'herbs',
];

const CONDIMENTS: WordTable = [
  ...wordTable(
    Object.fromEntries(CONDIMENT_WORDS.map((word) => [word, CONDIMENT_GRAMS])),
  ),
  [SPICE_PEPPER, CONDIMENT_GRAMS],
  [/^peppers?$/i, CONDIMENT_GRAMS],
];

type WeighedIngredient = {
  ingredient: NutritionIngredient;
  source: NutrientSource | null;
  grams: number;
  estimated: boolean;
};

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

function measuredGrams(ingredient: NutritionIngredient): number | null {
  const { quantity, unit, measure } = ingredient;
  return quantity != null && unit != null
    ? quantityToGrams({ quantity, unit }, foodNames(ingredient), measure)
    : null;
}

function guessedGrams(
  ingredient: NutritionIngredient,
  source: NutrientSource | null,
): number | null {
  const kcal = source?.energyKcal;
  return (
    lookup(PHRASE_GRAMS, [ingredient.measure]) ??
    lookup(CONDIMENTS, foodNames(ingredient)) ??
    (kcal != null && kcal <= LOW_ENERGY_KCAL_PER_100G
      ? LOW_ENERGY_GUESS_GRAMS
      : null)
  );
}

function weigh(ingredient: NutritionIngredient): WeighedIngredient | null {
  const source = nutrientSource(ingredient);
  const measured = measuredGrams(ingredient);
  if (measured != null) {
    if (!source && measured > MAX_UNLINKED_GRAMS) return null;
    return { ingredient, source, grams: measured, estimated: !source };
  }
  const guessed = guessedGrams(ingredient, source);
  return guessed == null
    ? null
    : { ingredient, source, grams: guessed, estimated: true };
}

const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

const isKnown = (value: number | null | undefined): value is number =>
  typeof value === 'number' && !Number.isNaN(value);

const round = (value: number) => Math.round(value * 10) / 10;

const kcalOf = ({ source, grams }: WeighedIngredient) =>
  ((source?.energyKcal ?? 0) * grams) / 100;

function dishGrams(weighed: WeighedIngredient[]): number {
  const foodName = ({ ingredient }: WeighedIngredient) =>
    ingredient.genericFood?.foodName ?? '';
  const absorbedWater = sum(
    weighed.map(
      (item) =>
        item.grams * (lookup(ABSORBED_WATER_PER_GRAM, [foodName(item)]) ?? 0),
    ),
  );
  const cookingLiquid = sum(
    weighed
      .filter((item) => COOKING_LIQUID.test(foodName(item)))
      .map(({ grams }) => grams),
  );
  return (
    sum(weighed.map(({ grams }) => grams)) +
    Math.max(0, absorbedWater - cookingLiquid)
  );
}

function per100g(
  weighed: WeighedIngredient[],
  totalGrams: number,
): NutritionalInfo['per100g'] {
  const counted = weighed.flatMap(({ source, grams }) =>
    source && grams > 0 ? [{ source, grams }] : [],
  );
  const amountOf = (field: NutrientField) =>
    sum(counted.map(({ source, grams }) => (source[field]! * grams) / 100));
  return Object.fromEntries(
    NUTRIENT_FIELDS.filter((field) =>
      counted.every(({ source }) => isKnown(source[field])),
    ).map((field) => [field, round((amountOf(field) * 100) / totalGrams)]),
  );
}

export function calculateRecipeNutrition({
  ingredients,
}: {
  ingredients: NutritionIngredient[];
}): NutritionalInfo | null {
  const weighed: WeighedIngredient[] = [];
  for (const ingredient of ingredients) {
    const item = weigh(ingredient);
    if (!item) return null;
    weighed.push(item);
  }
  if (weighed.length === 0) return null;

  const estimated = weighed.filter((item) => item.estimated);
  const totalKcal = sum(weighed.map(kcalOf));
  if (
    totalKcal > 0 &&
    sum(estimated.map(kcalOf)) / totalKcal > MAX_ESTIMATED_ENERGY_SHARE
  ) {
    return null;
  }

  const totalGrams = dishGrams(weighed);
  if (totalGrams <= 0) return null;

  return {
    per100g: per100g(weighed, totalGrams),
    estimated: true,
    missingIngredients: estimated.map(({ ingredient }) => ingredient.name),
  };
}

export function markedAsEntered(
  nutritionalInfo: Record<string, any> | undefined,
): Record<string, any> | undefined {
  return nutritionalInfo && { ...nutritionalInfo, estimated: false };
}

export function isUserProvidedNutrition(nutritionalInfo: unknown): boolean {
  return (
    typeof nutritionalInfo === 'object' &&
    nutritionalInfo !== null &&
    (nutritionalInfo as Partial<NutritionalInfo>).estimated !== true
  );
}

export function toNutritionJson(
  nutrition: NutritionalInfo | null,
): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull {
  return nutrition === null
    ? Prisma.JsonNull
    : (nutrition as unknown as Prisma.InputJsonValue);
}
