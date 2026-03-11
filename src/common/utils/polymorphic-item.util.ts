import { BadRequestException } from '@nestjs/common';

export interface PolymorphicItemDto {
  foodId?: string;
  foodCategoryId?: string;
}

export interface PolymorphicItemData {
  itemType: 'food' | 'food_category';
  foodId?: string;
  foodCategoryId?: string;
}

/**
 * Validates that exactly one of foodId or foodCategoryId is provided
 * @param dto - DTO containing foodId and/or foodCategoryId
 * @returns Validated polymorphic item data with itemType
 * @throws BadRequestException if validation fails
 */
export function validatePolymorphicItem(
  dto: PolymorphicItemDto,
): PolymorphicItemData {
  const hasFoodId = !!dto.foodId;
  const hasCategoryId = !!dto.foodCategoryId;

  if (hasFoodId && hasCategoryId) {
    throw new BadRequestException(
      'Cannot provide both foodId and foodCategoryId. Please provide only one.',
    );
  }

  if (!hasFoodId && !hasCategoryId) {
    throw new BadRequestException(
      'Must provide either foodId or foodCategoryId.',
    );
  }

  return {
    itemType: hasFoodId ? 'food' : 'food_category',
    foodId: dto.foodId,
    foodCategoryId: dto.foodCategoryId,
  };
}

export interface NutritionData {
  name: string;
  energyKcal?: number;
  energyKj?: number;
  protein?: number;
  fat?: number;
  carbohydrates?: number;
  fiber?: number;
  sugars?: number;
  salt?: number;
  sodium?: number;
}

/**
 * Extracts nutrition data from either a Food or FoodCategory item
 * @param item - Item with itemType and either food or foodCategory relation loaded
 * @returns Normalized nutrition data
 * @throws Error if item type is invalid or related data is missing
 */
export function extractNutritionData(item: {
  itemType: string;
  food?: any;
  foodCategory?: any;
}): NutritionData {
  if (item.itemType === 'food' && item.food) {
    return {
      name: item.food.name,
      energyKcal: item.food.energyKcal ?? undefined,
      energyKj: item.food.energyKj ?? undefined,
      protein: item.food.proteins ?? undefined,
      fat: item.food.fat ?? undefined,
      carbohydrates: item.food.carbohydrates ?? undefined,
      fiber: item.food.fiber ?? undefined,
      sugars: item.food.sugars ?? undefined,
      salt: item.food.salt ?? undefined,
      sodium: item.food.sodium ?? undefined,
    };
  }

  if (item.itemType === 'food_category' && item.foodCategory) {
    return {
      name: item.foodCategory.foodName,
      energyKcal: item.foodCategory.energyKcal ?? undefined,
      energyKj: item.foodCategory.energyKj ?? undefined,
      protein: item.foodCategory.proteins ?? undefined,
      fat: item.foodCategory.fat ?? undefined,
      carbohydrates: item.foodCategory.carbohydrates ?? undefined,
      fiber: item.foodCategory.fiber ?? undefined,
      sugars: item.foodCategory.sugars ?? undefined,
      salt: undefined, // FoodCategory doesn't have salt
      sodium: item.foodCategory.sodium ?? undefined,
    };
  }

  throw new Error(
    `Invalid item type '${item.itemType}' or missing related data`,
  );
}

/**
 * Gets the display name from either a Food or FoodCategory item
 * @param item - Item with itemType and either food or foodCategory relation loaded
 * @returns Display name
 */
export function getItemName(item: {
  itemType: string;
  food?: any;
  foodCategory?: any;
}): string {
  if (item.itemType === 'food' && item.food) {
    return item.food.name;
  }

  if (item.itemType === 'food_category' && item.foodCategory) {
    return item.foodCategory.foodName;
  }

  return 'Unknown Item';
}
