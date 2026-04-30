export type RecipeFixture = {
  id: string;
  userId: string | null;
  title: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  externalId?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  cuisineType?: string | null;
  category?: string | null;
  dietaryLabels?: string[];
  ingredients?: unknown[];
};

export type RecipeIngredientFixture = {
  id: string;
  recipeId: string;
  name: string;
  measure: string | null;
  order: number;
  itemType: 'food' | 'food_category';
  foodId?: string | null;
  foodCategoryId?: string | null;
  food?: unknown;
  foodCategory?: unknown;
};

export function buildRecipe(
  overrides: Partial<RecipeFixture> = {},
): RecipeFixture {
  return {
    id: 'recipe-1',
    userId: 'user-1',
    title: 'Test Recipe',
    isPublic: false,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    externalId: null,
    cuisineType: null,
    category: null,
    dietaryLabels: [],
    ingredients: [],
    ...overrides,
  };
}

export function buildRecipeIngredient(
  overrides: Partial<RecipeIngredientFixture> = {},
): RecipeIngredientFixture {
  return {
    id: 'ing-1',
    recipeId: 'recipe-1',
    name: 'Ingredient',
    measure: '100g',
    order: 0,
    itemType: 'food_category',
    foodId: null,
    foodCategoryId: null,
    ...overrides,
  };
}

export function emptyPaginationMock<T>(overrides: Partial<any> = {}) {
  return {
    data: [] as T[],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    ...overrides,
  };
}
