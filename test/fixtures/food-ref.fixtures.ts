/**
 * Polymorphic food-ref shapes (food_product vs generic_food relations) for unit tests.
 */

/** Macro numbers shared by food-ref “Apple” product row and recipe genericFood apple stub. */
export const APPLE_MACRO_NUTRITION = {
  energyKcal: 52,
  proteins: 0.3,
  fat: 0.2,
  carbohydrates: 14,
  fiber: 2.4,
  sugars: 10,
  sodium: 1,
} as const;

export const TEST_FOOD_PRODUCT_APPLE_NUTRITION = {
  name: 'Apple',
  ...APPLE_MACRO_NUTRITION,
  energyKj: 218,
  salt: 0.01,
} as const;

export const TEST_GENERIC_FOOD_FRUIT_NUTRITION = {
  foodName: 'Fruit',
  energyKcal: 50,
  energyKj: 210,
  proteins: 0.2,
  fat: 0.1,
  carbohydrates: 13,
  fiber: 2.1,
  sugars: 9,
  sodium: 2,
} as const;

/** Input to `extractNutritionData` — food_product branch */
export const TEST_ITEM_FOOD_PRODUCT_APPLE = {
  itemType: 'food_product' as const,
  foodProduct: TEST_FOOD_PRODUCT_APPLE_NUTRITION,
};

/** Input to `extractNutritionData` — generic_food branch */
export const TEST_ITEM_GENERIC_FOOD_FRUIT = {
  itemType: 'generic_food' as const,
  genericFood: TEST_GENERIC_FOOD_FRUIT_NUTRITION,
};

/** Minimal relation rows for `getFoodRefName` */
export function buildFoodRefItemFoodProduct(name: string) {
  return {
    itemType: 'food_product' as const,
    foodProduct: { name },
  };
}

export function buildFoodRefItemGenericFood(foodName: string) {
  return {
    itemType: 'generic_food' as const,
    genericFood: { foodName },
  };
}

/** Recipe ingredient `genericFood` stub (recipe-nutrition tests). */
export const RECIPE_INGREDIENT_APPLE_GENERIC_FOOD = {
  id: 'fc-1',
  foodName: 'Apple',
  ...APPLE_MACRO_NUTRITION,
};

/** Minimal nested genericFood row (recipe ingredient DTO / recipes.service tests). */
export const STUB_GENERIC_FOOD_CHICKEN_NEVO = {
  id: 'fc-1',
  foodName: 'Chicken',
  nevoCode: 1234,
} as const;

/** Minimal nested foodProduct row as returned by recipe ingredient includes (id, name, imageUrl). */
export function buildMinimalRecipeIngredientFoodProduct(
  overrides: Partial<{ id: string; name: string; imageUrl: string }> = {},
) {
  return {
    id: 'food-1',
    name: 'Product X',
    imageUrl: 'http://...',
    ...overrides,
  };
}
