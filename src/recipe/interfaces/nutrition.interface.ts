/**
 * Aggregated nutritional information for a recipe.
 * Values are totals for the entire recipe unless perServing is used.
 * All nutrient values are per 100g basis in source data, scaled by ingredient weight.
 */
export interface NutritionalInfo {
  // Core macronutrients
  energyKcal?: number; // Total calories
  energyKj?: number; // Total kilojoules
  proteins?: number; // Grams
  fat?: number; // Grams
  saturatedFat?: number; // Grams
  carbohydrates?: number; // Grams
  sugars?: number; // Grams
  fiber?: number; // Grams
  sodium?: number; // Milligrams

  // Extended micronutrients (optional, from NEVO data)
  vitaminA?: number; // µg
  vitaminC?: number; // mg
  vitaminD?: number; // µg
  calcium?: number; // mg
  iron?: number; // mg
  potassium?: number; // mg

  // Metadata
  servings?: number; // Recipe servings (from Recipe.servings)
  perServing?: Omit<
    NutritionalInfo,
    'servings' | 'perServing' | 'confidence' | 'missingIngredients'
  >;
  confidence?: number; // 0-1, aggregation quality score
  missingIngredients?: string[]; // Ingredient names without food links
}
