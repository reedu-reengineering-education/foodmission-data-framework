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

  servings?: number;
  perServing?: Omit<
    NutritionalInfo,
    'servings' | 'perServing' | 'confidence' | 'missingIngredients'
  >;
  confidence?: number;
  missingIngredients?: string[];
}
