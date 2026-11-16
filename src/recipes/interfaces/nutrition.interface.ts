import type { NutrientField } from '../nutrition/calculate-recipe-nutrition';

export type NutrientValues = Partial<Record<NutrientField, number>>;

export interface NutritionalInfo {
  per100g: NutrientValues;
  estimated: true;
  missingIngredients: string[];
}
