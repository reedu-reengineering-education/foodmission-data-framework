import { BadRequestException } from '@nestjs/common';
import {
  validateFoodRef,
  extractNutritionData,
  getFoodRefName,
  FoodRefDto,
} from './food-ref.util';
import {
  buildFoodRefItemFoodProduct,
  buildFoodRefItemGenericFood,
  TEST_ITEM_FOOD_PRODUCT_APPLE,
  TEST_ITEM_GENERIC_FOOD_FRUIT,
} from '../../../test/fixtures/food-ref.fixtures';

describe('validateFoodRef', () => {
  it('should return itemType food_product when only foodProductId is provided', () => {
    const dto: FoodRefDto = { foodProductId: 'f1' };
    expect(validateFoodRef(dto)).toEqual({
      itemType: 'food_product',
      foodProductId: 'f1',
      genericFoodId: undefined,
    });
  });

  it('should return itemType generic_food when only genericFoodId is provided', () => {
    const dto: FoodRefDto = { genericFoodId: 'c1' };
    expect(validateFoodRef(dto)).toEqual({
      itemType: 'generic_food',
      foodProductId: undefined,
      genericFoodId: 'c1',
    });
  });

  it('should throw if both foodProductId and genericFoodId are provided', () => {
    const dto: FoodRefDto = { foodProductId: 'f1', genericFoodId: 'c1' };
    expect(() => validateFoodRef(dto)).toThrow(BadRequestException);
  });

  it('should throw if neither foodProductId nor genericFoodId is provided', () => {
    const dto: FoodRefDto = {};
    expect(() => validateFoodRef(dto)).toThrow(BadRequestException);
  });
});

describe('extractNutritionData', () => {
  it('should extract nutrition data from foodProduct', () => {
    const item = TEST_ITEM_FOOD_PRODUCT_APPLE;
    expect(extractNutritionData(item)).toEqual({
      name: 'Apple',
      energyKcal: 52,
      energyKj: 218,
      protein: 0.3,
      fat: 0.2,
      carbohydrates: 14,
      fiber: 2.4,
      sugars: 10,
      salt: 0.01,
      sodium: 1,
    });
  });

  it('should extract nutrition data from genericFood', () => {
    const item = TEST_ITEM_GENERIC_FOOD_FRUIT;
    expect(extractNutritionData(item)).toEqual({
      name: 'Fruit',
      energyKcal: 50,
      energyKj: 210,
      protein: 0.2,
      fat: 0.1,
      carbohydrates: 13,
      fiber: 2.1,
      sugars: 9,
      salt: undefined,
      sodium: 2,
    });
  });

  it('should throw if itemType is invalid', () => {
    const item = { itemType: 'invalid' };
    expect(() => extractNutritionData(item as any)).toThrow();
  });
});

describe('getFoodRefName', () => {
  it('should return food name for food_product item', () => {
    const item = buildFoodRefItemFoodProduct('Banana');
    expect(getFoodRefName(item)).toBe('Banana');
  });

  it('should return genericFood name for generic_food item', () => {
    const item = buildFoodRefItemGenericFood('Vegetable');
    expect(getFoodRefName(item)).toBe('Vegetable');
  });

  it('should throw if foodProduct relation is not loaded', () => {
    const item = { itemType: 'food_product' };
    expect(() => getFoodRefName(item)).toThrow(
      'foodProduct relation not loaded for item with itemType \'food_product\'',
    );
  });
});
