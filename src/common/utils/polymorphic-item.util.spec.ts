import { BadRequestException } from '@nestjs/common';
import {
  validatePolymorphicItem,
  extractNutritionData,
  getItemName,
  PolymorphicItemDto,
} from './polymorphic-item.util';

describe('validatePolymorphicItem', () => {
  it('should return itemType food when only foodId is provided', () => {
    const dto: PolymorphicItemDto = { foodId: 'f1' };
    expect(validatePolymorphicItem(dto)).toEqual({
      itemType: 'food',
      foodId: 'f1',
      foodCategoryId: undefined,
    });
  });

  it('should return itemType food_category when only foodCategoryId is provided', () => {
    const dto: PolymorphicItemDto = { foodCategoryId: 'c1' };
    expect(validatePolymorphicItem(dto)).toEqual({
      itemType: 'food_category',
      foodId: undefined,
      foodCategoryId: 'c1',
    });
  });

  it('should throw if both foodId and foodCategoryId are provided', () => {
    const dto: PolymorphicItemDto = { foodId: 'f1', foodCategoryId: 'c1' };
    expect(() => validatePolymorphicItem(dto)).toThrow(BadRequestException);
  });

  it('should throw if neither foodId nor foodCategoryId is provided', () => {
    const dto: PolymorphicItemDto = {};
    expect(() => validatePolymorphicItem(dto)).toThrow(BadRequestException);
  });
});

describe('extractNutritionData', () => {
  it('should extract nutrition data from food', () => {
    const item = {
      itemType: 'food',
      food: {
        name: 'Apple',
        energyKcal: 52,
        energyKj: 218,
        proteins: 0.3,
        fat: 0.2,
        carbohydrates: 14,
        fiber: 2.4,
        sugars: 10,
        salt: 0.01,
        sodium: 1,
      },
    };
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

  it('should extract nutrition data from foodCategory', () => {
    const item = {
      itemType: 'food_category',
      foodCategory: {
        foodName: 'Fruit',
        energyKcal: 50,
        energyKj: 210,
        proteins: 0.2,
        fat: 0.1,
        carbohydrates: 13,
        fiber: 2.1,
        sugars: 9,
        sodium: 2,
      },
    };
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

describe('getItemName', () => {
  it('should return food name for food item', () => {
    const item = { itemType: 'food', food: { name: 'Banana' } };
    expect(getItemName(item)).toBe('Banana');
  });

  it('should return foodCategory name for food_category item', () => {
    const item = {
      itemType: 'food_category',
      foodCategory: { foodName: 'Vegetable' },
    };
    expect(getItemName(item)).toBe('Vegetable');
  });

  it('should return Unknown Item if no name found', () => {
    const item = { itemType: 'food' };
    expect(getItemName(item)).toBe('Unknown Item');
  });
});
