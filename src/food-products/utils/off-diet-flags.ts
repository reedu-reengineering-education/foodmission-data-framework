export interface OffDietFlags {
  isVegan: boolean | null;
  isVegetarian: boolean | null;
  isPalmOilFree: boolean | null;
}

/**
 * Derives diet flags from an OpenFoodFacts product.
 *
 * `ingredients_analysis_tags` is OFF's automatic ingredient analysis:
 *   "en:vegan" / "en:non-vegan" / "en:maybe-vegan" / "en:vegan-status-unknown"
 *   "en:vegetarian" / "en:non-vegetarian" / "en:maybe-vegetarian" / ...
 *   "en:palm-oil-free" / "en:palm-oil" / "en:may-contain-palm-oil" / ...
 * "maybe" and "unknown" map to null. A certified "en:vegan" /
 * "en:vegetarian" label in `labels_tags` wins over the analysis, and vegan
 * implies vegetarian.
 */
export function parseOffDietFlags(
  analysisTags?: unknown,
  labelTags?: unknown,
): OffDietFlags {
  const tags = Array.isArray(analysisTags) ? analysisTags : [];
  const labels = Array.isArray(labelTags) ? labelTags : [];

  const result: OffDietFlags = {
    isVegan: null,
    isVegetarian: null,
    isPalmOilFree: null,
  };

  for (const tag of tags) {
    if (tag === 'en:vegan') result.isVegan = true;
    else if (tag === 'en:non-vegan') result.isVegan = false;

    if (tag === 'en:vegetarian') result.isVegetarian = true;
    else if (tag === 'en:non-vegetarian') result.isVegetarian = false;

    if (tag === 'en:palm-oil-free') result.isPalmOilFree = true;
    else if (tag === 'en:palm-oil') result.isPalmOilFree = false;
  }

  if (labels.includes('en:vegan')) result.isVegan = true;
  if (labels.includes('en:vegetarian')) result.isVegetarian = true;
  if (result.isVegan) result.isVegetarian = true;

  return result;
}
