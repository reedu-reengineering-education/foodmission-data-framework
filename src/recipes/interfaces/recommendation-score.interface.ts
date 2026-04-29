import { FoodProductResponseDto } from '../../food-products/dto/food-product-response.dto';
import { GenericFoodResponseDto } from '../../generic-foods/dto/generic-food-response.dto';
import { Recipe, RecipeIngredient } from '@prisma/client';

export interface IngredientMatch {
  recipeIngredientId: string;
  ingredientName: string;
  pantryItemId: string;
  pantryItemName: string;
  matchType: 'food_product' | 'generic_food' | 'food_name';
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
}

export type RecipeWithIngredients = Recipe & {
  ingredients: (RecipeIngredient & {
    foodProduct: FoodProductResponseDto | null;
    genericFood: GenericFoodResponseDto | null;
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
