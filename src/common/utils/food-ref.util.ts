import { BadRequestException } from '@nestjs/common';

export interface FoodRefDto {
  foodProductId?: string;
  genericFoodId?: string;
}

export interface FoodRefData {
  itemType: 'food_product' | 'generic_food';
  foodProductId?: string;
  genericFoodId?: string;
}

/**
 * Validates that exactly one of foodProductId or genericFoodId is provided
 * @param dto - DTO containing foodProductId and/or genericFoodId
 * @returns Validated FoodRef data with itemType
 * @throws BadRequestException if validation fails
 */
export function validateFoodRef(dto: FoodRefDto): FoodRefData {
  const hasFoodProductId = !!dto.foodProductId;
  const hasGenericFoodId = !!dto.genericFoodId;

  if (hasFoodProductId && hasGenericFoodId) {
    throw new BadRequestException(
      'Cannot provide both foodProductId and genericFoodId. Please provide only one.',
    );
  }

  if (!hasFoodProductId && !hasGenericFoodId) {
    throw new BadRequestException(
      'Must provide either foodProductId or genericFoodId.',
    );
  }

  return {
    itemType: hasFoodProductId ? 'food_product' : 'generic_food',
    foodProductId: dto.foodProductId,
    genericFoodId: dto.genericFoodId,
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
 * Extracts nutrition data from either a FoodProduct or GenericFood item
 * @param item - Item with itemType and either foodProduct or genericFood relation loaded
 * @returns Normalized nutrition data
 * @throws Error if item type is invalid or related data is missing
 */
export function extractNutritionData(item: {
  itemType: string;
  foodProduct?: any;
  genericFood?: any;
}): NutritionData {
  if (item.itemType === 'food_product' && item.foodProduct) {
    return {
      name: item.foodProduct.name,
      energyKcal: item.foodProduct.energyKcal ?? undefined,
      energyKj: item.foodProduct.energyKj ?? undefined,
      protein: item.foodProduct.proteins ?? undefined,
      fat: item.foodProduct.fat ?? undefined,
      carbohydrates: item.foodProduct.carbohydrates ?? undefined,
      fiber: item.foodProduct.fiber ?? undefined,
      sugars: item.foodProduct.sugars ?? undefined,
      salt: item.foodProduct.salt ?? undefined,
      sodium: item.foodProduct.sodium ?? undefined,
    };
  }

  if (item.itemType === 'generic_food' && item.genericFood) {
    return {
      name: item.genericFood.foodName,
      energyKcal: item.genericFood.energyKcal ?? undefined,
      energyKj: item.genericFood.energyKj ?? undefined,
      protein: item.genericFood.proteins ?? undefined,
      fat: item.genericFood.fat ?? undefined,
      carbohydrates: item.genericFood.carbohydrates ?? undefined,
      fiber: item.genericFood.fiber ?? undefined,
      sugars: item.genericFood.sugars ?? undefined,
      salt: undefined, // GenericFood doesn't have salt
      sodium: item.genericFood.sodium ?? undefined,
    };
  }

  throw new Error(
    `Invalid item type '${item.itemType}' or missing related data`,
  );
}

/**
 * Gets the display name from either a FoodProduct or GenericFood item
 * @param item - Item with itemType and either foodProduct or genericFood relation loaded
 * @returns Display name
 */
export function getFoodRefName(item: {
  itemType: string;
  foodProduct?: any;
  genericFood?: any;
}): string {
  if (item.itemType === 'food_product' && item.foodProduct) {
    return item.foodProduct.name;
  }

  if (item.itemType === 'generic_food' && item.genericFood) {
    return item.genericFood.foodName;
  }

  return 'Unknown Item';
}
