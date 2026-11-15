export interface NutritionalInfo {
  energyKcal?: number;
  energyKj?: number;
  proteins?: number;
  fat?: number;
  saturatedFat?: number;
  carbohydrates?: number;
  sugars?: number;
  fiber?: number;
  sodium?: number;

  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;

  per100g?: NutrientValues;
  confidence?: number;
  missingIngredients?: string[];
}

export type NutrientValues = Omit<
  NutritionalInfo,
  'per100g' | 'confidence' | 'missingIngredients'
>;
