import { RecipeWithIngredients } from '../../common/types/prisma-relations';

export { RecipeWithIngredients };

export interface IngredientMatch {
  recipeIngredientId: string;
  ingredientName: string;
  pantryItemId: string;
  pantryItemName: string;
  matchType: 'food_product' | 'generic_food' | 'food_name';
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
}

export interface RecipeRecommendationScore {
  recipeId: string;
  recipe: RecipeWithIngredients;
  matchedIngredients: IngredientMatch[];
  totalIngredients: number;
  matchCount: number;
  expiringMatchCount: number;
}
