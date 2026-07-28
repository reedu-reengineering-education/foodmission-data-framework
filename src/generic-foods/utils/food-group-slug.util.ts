/**
 * Derives a stable kebab-case slug from the English NEVO foodGroup label.
 * Used for icon matching across locales — always pass the English parent value.
 *
 * Examples:
 *   "Vegetables" → "vegetables"
 *   "Milk and milk products" → "milk-and-milk-products"
 *   "Fish/crustacean/shellfish" → "fish-crustacean-shellfish"
 */
export function toFoodGroupSlug(englishFoodGroup: string): string {
  return englishFoodGroup
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
