import { Prisma } from '@prisma/client';

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
export const FOOD_PRODUCT_WITH_RELATIONS_INCLUDE =
  Prisma.validator<Prisma.FoodProductInclude>()({
    shelfLife: true,
    shoppingListItems: true,
    pantryItems: true,
    mealItems: true,
    recipeIngredients: true,
  });

export type FoodProductWithRelations = Prisma.FoodProductGetPayload<{
  include: typeof FOOD_PRODUCT_WITH_RELATIONS_INCLUDE;
}>;

export const SHOPPING_LIST_WITH_RELATIONS_INCLUDE =
  Prisma.validator<Prisma.ShoppingListInclude>()({
    items: {
      include: {
        foodProduct: true,
        genericFood: true,
      },
    },
  });

export type ShoppingListWithRelations = Prisma.ShoppingListGetPayload<{
  include: typeof SHOPPING_LIST_WITH_RELATIONS_INCLUDE;
}>;

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

export const RECIPE_WITH_INGREDIENTS_INCLUDE = {
  ingredients: {
    orderBy: { order: 'asc' },
    include: {
      foodProduct: { select: { id: true, name: true, imageUrl: true } },
      genericFood: {
        select: {
          id: true,
          foodName: true,
          nevoCode: true,
          energyKcal: true,
        },
      },
    },
  },
} as const;

export const RECIPE_WITH_INGREDIENTS_AND_MEALS_INCLUDE = {
  ...RECIPE_WITH_INGREDIENTS_INCLUDE,
  meals: true,
} as const;

export const RECIPE_CANDIDATE_WITH_INGREDIENTS_INCLUDE = {
  ingredients: {
    orderBy: { order: 'asc' },
    include: {
      foodProduct: true,
      genericFood: true,
    },
  },
} as const;

export type RecipeWithIngredients = Prisma.RecipeGetPayload<{
  include: typeof RECIPE_WITH_INGREDIENTS_INCLUDE;
}>;

export const GROUP_MEMBERSHIP_WITH_USER_INCLUDE = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export type GroupMembershipWithUser = Prisma.GroupMembershipGetPayload<{
  include: typeof GROUP_MEMBERSHIP_WITH_USER_INCLUDE;
}>;

export const USER_GROUP_WITH_RELATIONS_INCLUDE = {
  memberships: {
    include: GROUP_MEMBERSHIP_WITH_USER_INCLUDE,
  },
} as const;

export type UserGroupWithRelations = Prisma.UserGroupGetPayload<{
  include: typeof USER_GROUP_WITH_RELATIONS_INCLUDE;
}>;
