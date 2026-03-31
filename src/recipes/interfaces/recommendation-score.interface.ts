import { Recipe, RecipeIngredient, Food, FoodCategory } from '@prisma/client';

export interface IngredientMatch {
  recipeIngredientId: string;
  ingredientName: string;
  pantryItemId: string;
  pantryItemName: string;
  matchType: 'exact_food' | 'exact_category';
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
}

export type RecipeWithIngredients = Recipe & {
  ingredients: (RecipeIngredient & {
    food: Food | null;
    foodCategory: FoodCategory | null;
  })[];
};

export interface RecipeRecommendationScore {
  recipeId: string;
  recipe: RecipeWithIngredients;
  matchedIngredients: IngredientMatch[];
  totalIngredients: number;
  matchCount: number;
  matchPercentage: number;
  expiringMatchCount: number;
  finalScore: number;
}
