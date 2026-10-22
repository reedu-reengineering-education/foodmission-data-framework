/**
 * Curated display order for NEVO food groups (by slug), from common/healthy
 * staples to rarely relevant or less healthy groups.
 * Groups not listed here are appended after the curated ones.
 */
export const FOOD_GROUP_ORDER: readonly string[] = [
  'vegetables',
  'fruits',
  'legumes',
  'potatoes-and-tubers',
  'bread',
  'cereal-products-and-types-of-flour',
  'nuts-and-seeds',
  'milk-and-milk-products',
  'cheese',
  'eggs',
  'fish-crustacean-and-shellfish',
  'meat-substitutes-and-dairy-substitutes',
  'meat-and-poultry',
  'non-alcoholic-beverages',
  'fats-and-oils',
  'herbs-and-spices',
  'soups',
  'mixed-dishes',
  'savoury-bread-spreads',
  'cold-meat-cuts',
  'savoury-sauces',
  'savoury-snacks',
  'pastry-and-biscuits',
  'sugar-sweets-and-sweet-sauces',
  'alcoholic-beverages',
  'foods-for-special-nutritional-use',
  'miscellaneous-foods',
];

const RANK = new Map(FOOD_GROUP_ORDER.map((slug, i) => [slug, i]));

/**
 * Sorts items by curated food group order. Unknown slugs go last, keeping
 * their input order (stable sort).
 */
export function sortByFoodGroupOrder<T extends { slug: string }>(
  items: T[],
): T[] {
  const rank = (slug: string) => RANK.get(slug) ?? FOOD_GROUP_ORDER.length;
  return [...items].sort((a, b) => rank(a.slug) - rank(b.slug));
}
