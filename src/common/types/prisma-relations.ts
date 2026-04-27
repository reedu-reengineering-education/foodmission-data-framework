export const SHOPPING_LIST_ITEM_WITH_RELATIONS_INCLUDE = {
  shoppingList: true,
  foodProduct: true,
  genericFood: true,
} as const;

export type ShoppingListItemWithRelations = Prisma.ShoppingListItemGetPayload<{
  include: typeof SHOPPING_LIST_ITEM_WITH_RELATIONS_INCLUDE;
}>;
export const PANTRY_ITEM_WITH_RELATIONS_INCLUDE = {
  pantry: true,
  foodProduct: true,
  genericFood: true,
} as const;

export type PantryItemWithRelations = Prisma.PantryItemGetPayload<{
  include: typeof PANTRY_ITEM_WITH_RELATIONS_INCLUDE;
}>;
export const FOOD_PRODUCT_WITH_RELATIONS_INCLUDE = {
  shelfLife: true,
  shoppingListItems: true,
  pantryItems: true,
  mealItems: true,
  recipeIngredients: true,
} as const;

export type FoodProductWithRelations = Prisma.FoodProductGetPayload<{
  include: typeof FOOD_PRODUCT_WITH_RELATIONS_INCLUDE;
}>;
import { Prisma } from '@prisma/client';

export const PANTRY_WITH_RELATIONS_INCLUDE = {
  items: {
    include: {
      foodProduct: true,
      genericFood: true,
    },
  },
} as const;

export type PantryWithRelations = Prisma.PantryGetPayload<{
  include: typeof PANTRY_WITH_RELATIONS_INCLUDE;
}>;

export const MEAL_ITEM_WITH_RELATIONS_INCLUDE = {
  meal: true,
  foodProduct: true,
  genericFood: true,
} as const;

export type MealItemWithRelations = Prisma.MealItemGetPayload<{
  include: typeof MEAL_ITEM_WITH_RELATIONS_INCLUDE;
}>;
