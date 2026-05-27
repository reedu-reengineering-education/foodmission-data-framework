/**
 * Strips the language prefix and normalises dashes from an OpenFoodFacts
 * category tag so it can be compared against human-readable category names.
 *
 * Examples:
 *   "en:dairy-products" → "dairy products"
 *   "fr:produits-laitiers" → "produits laitiers"
 *   "cheeses" → "cheeses"
 */
export function offTagToPlain(tag: string): string {
  return tag
    .replace(/^[a-z]{2}:/, '')
    .replace(/-/g, ' ')
    .toLowerCase();
}

/**
 * Converts an array of OpenFoodFacts category tags into plain-text hints
 * suitable for shelf-life category matching.
 *
 * Filters out empty strings that may result from malformed tags.
 */
export function buildCategoryHints(tags: string[]): string[] {
  return tags.map(offTagToPlain).filter(Boolean);
}
