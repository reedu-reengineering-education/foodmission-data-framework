export interface NutrientValues {
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
}

export interface NutritionalInfo {
  per100g: NutrientValues;
  estimated: true;
  missingIngredients: string[];
}
