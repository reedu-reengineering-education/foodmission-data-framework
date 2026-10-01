/**
 * Meal-relevant facts read from OpenFoodFacts category and label tags.
 * Used to derive meal-log flags (see `meal-logs/derive-meal-flags.ts`); the
 * diet status (vegan / vegetarian) comes from `parseOffDietFlags` instead.
 *
 * Definitions match the NEVO `GenericFood` flags so a meal gets the same flags
 * whichever source its items come from:
 * - meat counts meat, poultry, fish and seafood, not derivatives (gelatin,
 *   stock) — those only make a product non-vegetarian;
 * - legumes are pulses, peas, green and broad beans, peanuts (incl. peanut
 *   butter) and soy/pulse foods (tofu, tempeh, hummus), not soy drinks or sauce.
 */

/** Parents OFF puts every meat, fish or seafood product (and meal) under. */
const MEAT_CATEGORIES: ReadonlySet<string> = new Set([
  'en:meats',
  'en:meats-and-their-products',
  'en:prepared-meats',
  'en:poultry',
  'en:poultries',
  'en:sausages',
  'en:hams',
  'en:fishes',
  'en:fishes-and-their-products',
  'en:seafood',
  'en:crustaceans',
  'en:meals-with-meat',
  'en:meals-with-chicken',
  'en:meals-with-fish',
  'en:poultry-meals',
]);

const LEGUME_CATEGORIES: ReadonlySet<string> = new Set([
  'en:legumes',
  'en:legumes-and-their-products',
  'en:pulses',
  'en:legume-seeds',
  'en:dried-legumes',
  'en:canned-legumes',
  'en:beans',
  'en:common-beans',
  'en:lentils',
  'en:chickpeas',
  'en:peas',
  'en:green-peas',
  'en:snow-peas',
  'en:sugar-snap-peas',
  'en:green-beans',
  'en:broad-beans',
  'en:peanuts',
  'en:peanut-butters',
  'en:tofu',
  'xx:tofu',
  'en:tempeh',
  'en:hummus',
  'en:falafels',
]);

/**
 * Soy products OFF files under legumes that don't count as eating legumes. A
 * product carrying any of them is not a legume even with a legume parent.
 */
const NOT_LEGUME_CATEGORIES: ReadonlySet<string> = new Set([
  'en:soy-sauces',
  'en:soy-milks',
  'en:soy-based-drinks',
  'en:soy-desserts',
  'en:soy-yogurts',
]);

const ANCIENT_GRAIN_CATEGORIES: ReadonlySet<string> = new Set([
  'en:quinoa',
  'en:quinoas',
  'en:spelt',
  'en:spelt-flours',
  'en:buckwheat',
  'en:buckwheat-flours',
  'en:buckwheat-groats',
  'en:millet',
  'en:millets',
  'en:amaranth',
  'en:teff',
  'en:sorghum',
]);

const FISH_CATEGORIES: ReadonlySet<string> = new Set([
  'en:fishes',
  'en:fishes-and-their-products',
  'en:seafood',
  'en:crustaceans',
  'en:meals-with-fish',
]);

/** Fish rich in omega-3, for healthy fat. */
const OILY_FISH_CATEGORIES: ReadonlySet<string> = new Set([
  'en:fatty-fishes',
  'en:salmons',
  'en:mackerels',
  'en:sardines',
  'en:herrings',
  'en:anchovies',
  'en:trouts',
  'en:smoked-salmons',
]);

const EGG_CATEGORIES: ReadonlySet<string> = new Set([
  'en:eggs',
  'en:chicken-eggs',
]);

/** Dairy that is protein-rich (not butter or cream, which OFF also files under dairies). */
const PROTEIN_DAIRY_CATEGORIES: ReadonlySet<string> = new Set([
  'en:cheeses',
  'en:fresh-cheeses',
  'en:milks',
  'en:yogurts',
  'en:skyrs',
  'en:quarks',
]);

const NUT_CATEGORIES: ReadonlySet<string> = new Set([
  'en:nuts',
  'en:peanuts',
  'en:almonds',
  'en:walnuts',
  'en:cashew-nuts',
  'en:hazelnuts',
  'en:pistachios',
  'en:nut-butters',
  'en:peanut-butters',
]);

const SEED_CATEGORIES: ReadonlySet<string> = new Set([
  'en:sunflower-seeds',
  'en:pumpkin-seeds',
  'en:chia-seeds',
  'en:flax-seeds',
  'en:linseeds',
  'en:sesame-seeds',
  'en:hemp-seeds',
  'en:tahini',
]);

const SOY_CATEGORIES: ReadonlySet<string> = new Set([
  'en:tofu',
  'xx:tofu',
  'en:tempeh',
]);

const MEAT_SUBSTITUTE_CATEGORIES: ReadonlySet<string> = new Set([
  'en:meat-alternatives',
  'en:meat-analogues',
]);

/** Plant fat sources whose fat is mostly unsaturated. */
const FAT_SOURCE_CATEGORIES: ReadonlySet<string> = new Set([
  'en:vegetable-oils',
  'en:olive-oils',
  'en:extra-virgin-olive-oils',
  'en:rapeseed-oils',
  'en:sunflower-oils',
  'en:linseed-oils',
  'en:walnut-oils',
  'en:avocados',
  'en:olives',
  'en:margarines',
  ...NUT_CATEGORIES,
  ...SEED_CATEGORIES,
]);

/** Whole-grain staples OFF doesn't tag with a "whole-grain" name. */
const WHOLEGRAIN_CATEGORIES: ReadonlySet<string> = new Set([
  'en:oat-flakes',
  'en:rolled-oats',
  'en:oatmeals',
  'en:porridges',
  'en:mueslis',
  'en:brown-rices',
  'en:bulgur',
  'en:quinoa',
  'en:buckwheat',
  'en:millet',
]);

const WHOLEGRAIN_TAG =
  /^[a-z]{2}:.*(whole-?grain|wholemeal|whole-?wheat|whole-rye)/;

export interface OffCategoryFacts {
  meat: boolean;
  fish: boolean;
  oilyFish: boolean;
  eggs: boolean;
  proteinDairy: boolean;
  legume: boolean;
  soy: boolean;
  nuts: boolean;
  seeds: boolean;
  meatSubstitute: boolean;
  fatSource: boolean;
  ancientGrain: boolean;
}

export function offCategoryFacts(
  categories: readonly string[],
): OffCategoryFacts {
  const has = (set: ReadonlySet<string>) =>
    categories.some((tag) => set.has(tag));
  return {
    meat: has(MEAT_CATEGORIES),
    fish: has(FISH_CATEGORIES),
    oilyFish: has(OILY_FISH_CATEGORIES),
    eggs: has(EGG_CATEGORIES),
    proteinDairy: has(PROTEIN_DAIRY_CATEGORIES),
    legume: has(LEGUME_CATEGORIES) && !has(NOT_LEGUME_CATEGORIES),
    soy: has(SOY_CATEGORIES),
    nuts: has(NUT_CATEGORIES),
    seeds: has(SEED_CATEGORIES),
    meatSubstitute: has(MEAT_SUBSTITUTE_CATEGORIES),
    fatSource: has(FAT_SOURCE_CATEGORIES),
    ancientGrain: has(ANCIENT_GRAIN_CATEGORIES),
  };
}

/**
 * Whether category or label tags mark a whole-grain product: a tag naming
 * whole grain / wholemeal / whole wheat (`en:whole-grain-pastas`,
 * `en:wholemeal-breads`, label `en:whole-grain`) or a whole-grain staple
 * (oat flakes, muesli, brown rice, bulgur, quinoa, …).
 */
export function isWholegrainProduct(tags: readonly string[]): boolean {
  return tags.some(
    (tag) => WHOLEGRAIN_CATEGORIES.has(tag) || WHOLEGRAIN_TAG.test(tag),
  );
}

/**
 * Sustainability certification labels: organic, fair trade, MSC/ASC seafood
 * and EU geographical indications (PDO/PGI/TSG). OFF label tags vary by
 * certifier and country (`en:fr-bio-01`, `de:msc-c-50086`,
 * `en:pdo-arroz-de-valencia`), so the tag name is matched by pattern.
 * Packaging labels (`en:fsc`, `en:green-dot`) and vague claims
 * (`en:sustainable`) do not count.
 */
const CERTIFICATION_PATTERNS: readonly RegExp[] = [
  // Organic
  /^organic$/,
  /-organic$/,
  // EU organic control-body codes: fr-bio-01, de-oko-007, pl-eko-01, …
  /^[a-z]{2}-(bio|oko|oeko|eko|ekoloski|organic)-\d+$/,
  /^ab-agriculture-biologique$/,
  /^demeter$/,
  /^naturland$/,
  /^bioland$/,
  // Fair trade
  /^fair-?trade/,
  /^naturland-fair$/,
  /^rainforest-alliance/,
  /^utz-certified$/,
  // Seafood
  /^sustainable-seafood-msc$/,
  /^msc-c-/,
  /^responsible-aquaculture-asc$/,
  // Geographical indications
  /^(pdo|pgi|tsg)(-|$)/,
];

export function isCertifiedLabel(label: string): boolean {
  const name = label.replace(/^[a-z]{2}:/, '');
  return CERTIFICATION_PATTERNS.some((pattern) => pattern.test(name));
}
