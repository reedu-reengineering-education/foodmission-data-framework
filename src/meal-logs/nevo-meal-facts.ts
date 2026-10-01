import { GenericFood } from '@prisma/client';

/**
 * Meal-relevant facts for a NEVO food (`GenericFood`), from its curated diet
 * flags, food group and nutrients per 100 g. Thresholds are per 100 g, not
 * per portion: meal items only have a reliable weight when the unit is G/KG.
 */

/**
 * NEVO foods that count as ancient grains: quinoa, millet, buckwheat, spelt.
 * NEVO has no field for it, so the codes are listed by hand.
 */
export const ANCIENT_GRAIN_NEVO_CODES: ReadonlySet<number> = new Set([
  // Quinoa raw, cooked
  3153, 3154,
  // Millet raw, boiled
  847, 2159,
  // Buckwheat flour, groats
  208, 1019,
  // Spelt flour, wholemeal flour, flakes
  5576, 5577, 5582,
]);

/**
 * NEVO foods that are whole-grain products: wholemeal and rye breads, oats,
 * porridge, muesli, brown rice, wholemeal pasta/couscous/wraps, bulgur, whole
 * barley, millet, buckwheat, quinoa, whole spelt/barley flakes and wholemeal
 * flours. Not included: sweet biscuits, cakes and bars, popcorn, bran or germ
 * on their own, "brown"/"multigrain" breads that aren't wholemeal, and oat
 * drinks.
 */
export const WHOLEGRAIN_NEVO_CODES: ReadonlySet<number> = new Set([
  // Grains, flours and flakes
  208, 213, 218, 222, 225, 712, 811, 847, 1014, 1015, 1018, 1019, 1890, 2157,
  2159, 3153, 3154, 3200, 5518, 5539, 5577, 5581, 5582, 5583, 5584,
  // Breakfast: porridge and muesli
  288, 3050, 2675, 2676, 2677, 2809, 5491, 5495, 5496, 5592, 5593, 5594, 5595,
  // Wholemeal and rye breads, crispbread, wraps
  242, 246, 655, 1011, 1017, 1395, 1459, 1779, 2348, 2353, 2354, 2357, 2703,
  2782, 2788, 2798, 2804, 2811, 3190, 3209, 3210, 3211, 3212, 3213, 3326, 5040,
  5468, 5482, 5567,
  // Wholemeal pancakes and mixes
  2581, 2582, 5349,
]);

const MEAT_GROUPS: ReadonlySet<string> = new Set([
  'Meat and poultry',
  'Cold meat cuts',
]);
const FISH_GROUP = 'Fish, crustacean and shellfish';

/** Food groups whose fat counts as a healthy (unsaturated) fat source. */
const FAT_SOURCE_GROUPS: ReadonlySet<string> = new Set([
  'Fats and oils',
  'Nuts and seeds',
  'Vegetables',
  'Fruits',
]);

/** Whole plant foods for plant diversity (fruit, veg, pulses, nuts, seeds). */
const PLANT_GROUPS: ReadonlySet<string> = new Set([
  'Vegetables',
  'Fruits',
  'Legumes',
  'Nuts and seeds',
]);

const SOY_NAME = /\b(tofu|tempeh|soya?|soja)\b/i;
const PEANUT_NAME = /\b(peanuts?|pinda\w*)\b/i;
const SEED_NAME = /\bseeds?\b|\b(linseed|chia|sesame|tahin\w*)\b/i;
const NUT_SPREAD_NAME = /\b(nut|peanut|tahin\w*|sesame)\b/i;

/** Protein source keys for `NUTRITION_PROTEIN_VARIETY_LOGGED`. */
export const ProteinSource = {
  MEAT: 'MEAT',
  FISH: 'FISH',
  EGGS: 'EGGS',
  DAIRY: 'DAIRY',
  LEGUMES: 'LEGUMES',
  TOFU: 'TOFU',
  NUTS: 'NUTS',
  SEEDS: 'SEEDS',
  MEAT_SUBSTITUTE: 'MEAT_SUBSTITUTE',
} as const;
export type ProteinSourceValue =
  (typeof ProteinSource)[keyof typeof ProteinSource];

export type NevoFood = Pick<
  GenericFood,
  | 'id'
  | 'nevoCode'
  | 'foodGroup'
  | 'foodName'
  | 'vegan'
  | 'vegetarian'
  | 'meatOrFish'
  | 'legume'
  | 'proteins'
  | 'fiber'
  | 'fat'
  | 'saturatedFat'
  | 'monoUnsaturatedFat'
  | 'polyUnsaturatedFat'
  | 'omega3Fat'
>;

/**
 * Where a protein-rich NEVO food's protein comes from, or `null` when the food
 * isn't protein-rich. A food counts when it's from a protein food group
 * (meat, fish, eggs, cheese) or reaches that group's protein minimum per
 * 100 g: legumes ≥ 5 g, nuts and seeds ≥ 7 g, meat substitutes ≥ 8 g, milk
 * products ≥ 3.4 g (milk, yoghurt, quark). Peanuts count as nuts; sauces
 * (peanut sauce) don't count.
 */
export function nevoProteinSource(food: NevoFood): ProteinSourceValue | null {
  const protein = food.proteins ?? 0;
  const group = food.foodGroup;

  if (group === FISH_GROUP) return ProteinSource.FISH;
  if (MEAT_GROUPS.has(group)) return ProteinSource.MEAT;
  if (group === 'Eggs') return ProteinSource.EGGS;
  if (group === 'Cheese') return ProteinSource.DAIRY;
  if (group === 'Milk and milk products') {
    return protein >= 3.4 ? ProteinSource.DAIRY : null;
  }
  if (group === 'Savoury sauces') return null;
  if (group === 'Nuts and seeds') {
    if (protein < 7) return null;
    return SEED_NAME.test(food.foodName)
      ? ProteinSource.SEEDS
      : ProteinSource.NUTS;
  }
  if (food.legume && protein >= 5) {
    if (PEANUT_NAME.test(food.foodName)) return ProteinSource.NUTS;
    return SOY_NAME.test(food.foodName)
      ? ProteinSource.TOFU
      : ProteinSource.LEGUMES;
  }
  if (group === 'Meat substitutes and dairy substitutes' && protein >= 8) {
    return ProteinSource.MEAT_SUBSTITUTE;
  }
  return null;
}

/** At least 6 g fibre per 100 g — the EU "high fibre" claim threshold. */
export function isHighFibre(fiberPer100g: number | null | undefined): boolean {
  return (fiberPer100g ?? 0) >= 6;
}

/**
 * A source of unsaturated fat: oily fish (≥ 1 g omega-3 per 100 g), or a
 * vegetarian oil, nut, seed, avocado/olive or nut/seed spread with ≥ 10 g fat
 * per 100 g of which mono- plus polyunsaturated is at least twice the
 * saturated fat. Fried and mayonnaise-based foods don't qualify by group.
 */
export function nevoHealthyFat(food: NevoFood): boolean {
  if (food.foodGroup === FISH_GROUP) {
    return (food.omega3Fat ?? 0) >= 1;
  }
  const fatSource =
    FAT_SOURCE_GROUPS.has(food.foodGroup) ||
    (food.foodGroup === 'Savoury bread spreads' &&
      (food.legume || NUT_SPREAD_NAME.test(food.foodName)));
  if (!fatSource || !food.vegetarian) {
    return false;
  }
  const fat = food.fat ?? 0;
  const saturated = food.saturatedFat ?? 0;
  const unsaturated =
    (food.monoUnsaturatedFat ?? 0) + (food.polyUnsaturatedFat ?? 0);
  return fat >= 10 && unsaturated >= 2 * saturated;
}

/**
 * Whether a NEVO food counts as one plant food for plant diversity: fruit,
 * vegetables, pulses, nuts and seeds, whole grains, pulse foods (tofu,
 * hummus) and herbs and spices with fibre (so not stock, salt or seasoning
 * powders).
 */
export function isNevoPlantFood(food: NevoFood): boolean {
  if (PLANT_GROUPS.has(food.foodGroup)) return true;
  if (WHOLEGRAIN_NEVO_CODES.has(food.nevoCode)) return true;
  if (
    food.legume &&
    (food.foodGroup === 'Meat substitutes and dairy substitutes' ||
      food.foodGroup === 'Savoury bread spreads')
  ) {
    return true;
  }
  return (
    food.foodGroup === 'Herbs and spices' && food.vegan && (food.fiber ?? 0) > 0
  );
}
