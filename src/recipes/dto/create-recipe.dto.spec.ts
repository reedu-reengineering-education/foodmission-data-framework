import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateRecipeDto } from './create-recipe.dto';

describe('CreateRecipeDto with ingredients', () => {
  it('should validate recipe without ingredients', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      title: 'Simple Recipe',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate recipe with valid ingredients array', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      title: 'Recipe with Ingredients',
      ingredients: [
        { name: 'Chicken', measure: '500g', order: 1 },
        { name: 'Salt', measure: '1 tsp', order: 2 },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate recipe with ingredient linked to foodCategoryId', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      title: 'Linked Recipe',
      ingredients: [
        {
          name: 'Chicken',
          measure: '500g',
          foodCategoryId: '550e8400-e29b-41d4-a716-446655440000',
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate recipe with ingredient linked to foodId', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      title: 'Product Recipe',
      ingredients: [
        {
          name: 'Branded Product',
          measure: '1 pack',
          foodId: '550e8400-e29b-41d4-a716-446655440000',
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when ingredient has both foodId and foodCategoryId', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      title: 'Invalid Recipe',
      ingredients: [
        {
          name: 'Ambiguous Item',
          measure: '100g',
          foodId: '550e8400-e29b-41d4-a716-446655440000',
          foodCategoryId: '550e8400-e29b-41d4-a716-446655440001',
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail validation when ingredient name is missing', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      title: 'Bad Recipe',
      ingredients: [{ measure: '500g', order: 1 }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate empty ingredients array', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      title: 'No Ingredients Recipe',
      ingredients: [],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when ingredients is not an array', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      title: 'Wrong Type Recipe',
      ingredients: 'not an array',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
