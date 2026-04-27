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

    it('should validate dto with genericFoodId only', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        ...validDto,
        genericFoodId: '550e8400-e29b-41d4-a716-446655440000',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate dto with foodProductId only', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        ...validDto,
        foodProductId: '550e8400-e29b-41d4-a716-446655440000',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when both foodProductId and genericFoodId are provided', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        ...validDto,
        foodProductId: '550e8400-e29b-41d4-a716-446655440000',
        genericFoodId: '550e8400-e29b-41d4-a716-446655440001',
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

    it('should fail validation when foodProductId is not a valid UUID', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        ...validDto,
        foodProductId: 'not-a-uuid',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'foodProductId')).toBe(true);
    });

    it('should fail validation when genericFoodId is not a valid UUID', async () => {
      const dto = plainToInstance(CreateRecipeIngredientDto, {
        ...validDto,
        genericFoodId: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'genericFoodId')).toBe(true);
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

    it('should validate update with genericFoodId', async () => {
      const dto = plainToInstance(UpdateRecipeIngredientDto, {
        genericFoodId: '550e8400-e29b-41d4-a716-446655440000',
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
        itemType: 'generic_food',
        genericFoodId: 'fc-1',
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
      expect(dto.itemType).toBe('generic_food');
      expect(dto.genericFoodId).toBe('fc-1');
      expect(dto.createdAt).toEqual(data.createdAt);
      expect(dto.updatedAt).toEqual(data.updatedAt);
    });

    it('should expose optional food relation', () => {
      const data = {
        id: 'ing-1',
        recipeId: 'recipe-1',
        name: 'Product X',
        itemType: 'food_product',
        foodProductId: 'food-1',
        foodProduct: {
          id: 'food-1',
          name: 'Product X',
          imageUrl: 'http://...',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dto = plainToInstance(RecipeIngredientResponseDto, data, {
        excludeExtraneousValues: true,
      });

      expect(dto.foodProductId).toBe('food-1');
      expect(dto.foodProduct).toEqual(data.foodProduct);
    });

    it('should expose optional genericFood relation', () => {
      const data = {
        id: 'ing-1',
        recipeId: 'recipe-1',
        name: 'Chicken',
        itemType: 'generic_food',
        genericFoodId: 'fc-1',
        genericFood: { id: 'fc-1', foodName: 'Chicken', nevoCode: 1234 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dto = plainToInstance(RecipeIngredientResponseDto, data, {
        excludeExtraneousValues: true,
      });

      expect(dto.genericFoodId).toBe('fc-1');
      expect(dto.genericFood).toEqual(data.genericFood);
    });
  });
});
