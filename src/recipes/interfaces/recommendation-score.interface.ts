import { FoodProductResponseDto } from '../../food-products/dto/food-response.dto';
import { GenericFoodResponseDto } from '../../generic-foods/dto/generic-food-response.dto';
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
    food: FoodProductResponseDto | null;
    food: FoodProductResponseDto | null;
    foodCategory: GenericFoodResponseDto | null;
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
