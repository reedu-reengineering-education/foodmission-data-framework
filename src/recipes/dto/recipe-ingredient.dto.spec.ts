import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateRecipeIngredientDto,
  UpdateRecipeIngredientDto,
  RecipeIngredientResponseDto,
} from './recipe-ingredient.dto';

describe('RecipeIngredient DTOs', () => {
  describe('CreateRecipeIngredientDto', () => {
    const validDto = {
      name: 'Chicken Breast',
      measure: '500g',
      order: 1,
    };

    it('should validate a valid dto with name only', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, { name: 'Salt' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate a valid dto with all optional fields', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, validDto);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when name is missing', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        measure: '500g',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('should fail validation when name is empty', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        ...validDto,
        name: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate dto with foodCategoryId only', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        ...validDto,
        foodCategoryId: '550e8400-e29b-41d4-a716-446655440000',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate dto with foodId only', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        ...validDto,
        foodId: '550e8400-e29b-41d4-a716-446655440000',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when both foodId and foodCategoryId are provided', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        ...validDto,
        foodId: '550e8400-e29b-41d4-a716-446655440000',
        foodCategoryId: '550e8400-e29b-41d4-a716-446655440001',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const constraintError = errors.find(
        (e) =>
          e.constraints &&
          Object.keys(e.constraints).some((k) =>
            k.includes('OptionalExclusiveFoodReference'),
          ),
      );
      expect(constraintError).toBeDefined();
    });

    it('should fail validation when foodId is not a valid UUID', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        ...validDto,
        foodId: 'not-a-uuid',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'foodId')).toBe(true);
    });

    it('should fail validation when foodCategoryId is not a valid UUID', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        ...validDto,
        foodCategoryId: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'foodCategoryId')).toBe(true);
    });

    it('should fail validation when order is negative', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        ...validDto,
        order: -1,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'order')).toBe(true);
    });

    it('should accept order of 0', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        ...validDto,
        order: 0,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('UpdateRecipeIngredientDto', () => {
    it('should validate an empty update dto (all optional)', async () => {
      const dto = plainToInstance(UpdateRecipeIngredientDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate partial update with name only', async () => {
      const dto = plainToInstance(UpdateRecipeIngredientDto, {
        name: 'New Name',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate partial update with measure only', async () => {
      const dto = plainToInstance(UpdateRecipeIngredientDto, {
        measure: '1kg',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate update with foodCategoryId', async () => {
      const dto = plainToInstance(UpdateRecipeIngredientDto, {
        foodCategoryId: '550e8400-e29b-41d4-a716-446655440000',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when order is negative', async () => {
      const dto = plainToInstance(UpdateRecipeIngredientDto, {
        order: -5,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('RecipeIngredientResponseDto', () => {
    it('should expose all required fields', () => {
      const data = {
        id: 'ing-1',
        recipeId: 'recipe-1',
        name: 'Chicken',
        measure: '500g',
        order: 1,
        itemType: 'food_category',
        foodCategoryId: 'fc-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dto = plainToInstance(RecipeIngredientResponseDto, data, {
        excludeExtraneousValues: true,
      });

      expect(dto.id).toBe('ing-1');
      expect(dto.recipeId).toBe('recipe-1');
      expect(dto.name).toBe('Chicken');
      expect(dto.measure).toBe('500g');
      expect(dto.order).toBe(1);
      expect(dto.itemType).toBe('food_category');
      expect(dto.foodCategoryId).toBe('fc-1');
      expect(dto.createdAt).toEqual(data.createdAt);
      expect(dto.updatedAt).toEqual(data.updatedAt);
    });

    it('should expose optional food relation', () => {
      const data = {
        id: 'ing-1',
        recipeId: 'recipe-1',
        name: 'Product X',
        itemType: 'food',
        foodId: 'food-1',
        food: { id: 'food-1', name: 'Product X', imageUrl: 'http://...' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dto = plainToInstance(RecipeIngredientResponseDto, data, {
        excludeExtraneousValues: true,
      });

      expect(dto.foodId).toBe('food-1');
      expect(dto.food).toEqual(data.food);
    });

    it('should expose optional foodCategory relation', () => {
      const data = {
        id: 'ing-1',
        recipeId: 'recipe-1',
        name: 'Chicken',
        itemType: 'food_category',
        foodCategoryId: 'fc-1',
        foodCategory: { id: 'fc-1', foodName: 'Chicken', nevoCode: 1234 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dto = plainToInstance(RecipeIngredientResponseDto, data, {
        excludeExtraneousValues: true,
      });

      expect(dto.foodCategoryId).toBe('fc-1');
      expect(dto.foodCategory).toEqual(data.foodCategory);
    });
  });
});
