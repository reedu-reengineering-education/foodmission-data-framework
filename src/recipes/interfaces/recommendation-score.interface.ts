import { FoodProductResponseDto } from '../../food-products/dto/food-response.dto';
import { FoodCategoryResponseDto } from '../../generic-foods/dto/food-category-response.dto';
import { Recipe, RecipeIngredient } from '@prisma/client';

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
    food: FoodResponseDto | null;
    food: FoodProductResponseDto | null;
    foodCategory: FoodCategoryResponseDto | null;
  })[];
};

export interface RecipeRecommendationScore {
  recipeId: string;
  recipe: RecipeWithIngredients;
  matchedIngredients: IngredientMatch[];
  totalIngredients: number;
  matchCount: number;
  expiringMatchCount: number;
}
