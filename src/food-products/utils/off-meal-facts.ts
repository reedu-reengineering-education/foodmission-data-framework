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

export interface OffCategoryFacts {
  meat: boolean;
  legume: boolean;
  ancientGrain: boolean;
}

export function offCategoryFacts(
  categories: readonly string[],
): OffCategoryFacts {
  const has = (set: ReadonlySet<string>) =>
    categories.some((tag) => set.has(tag));
  return {
    meat: has(MEAT_CATEGORIES),
    legume: has(LEGUME_CATEGORIES) && !has(NOT_LEGUME_CATEGORIES),
    ancientGrain: has(ANCIENT_GRAIN_CATEGORIES),
  };
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
