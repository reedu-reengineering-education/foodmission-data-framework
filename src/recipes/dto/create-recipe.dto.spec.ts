import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateRecipeDto } from './create-recipe.dto';
import { UpdateRecipeDto } from './update-recipe.dto';

describe('CreateRecipeDto with ingredients', () => {
  it('should validate recipe without ingredients', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      title: 'Simple Recipe',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject more than 100 ingredients', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      title: 'Long Recipe',
      ingredients: Array.from({ length: 101 }, (_, i) => ({
        name: `Item ${i}`,
      })),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'ingredients')).toBe(true);
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
    expect(errors.some((e) => e.property === 'ingredients')).toBe(true);
  });

  it('should fail the recipe when one of its ingredients is invalid', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      title: 'Bad Recipe',
      ingredients: [{ name: 'Salt' }, { measure: '500g' }],
    });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toEqual(['ingredients']);
  });

  it('should reject nutritionalInfo that is not an object', async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      title: 'Recipe',
      nutritionalInfo: '520 kcal',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'nutritionalInfo')).toBe(true);
  });
});

describe('UpdateRecipeDto', () => {
  it('rejects an ingredient linked to both a food product and a generic food', async () => {
    const dto = plainToInstance(UpdateRecipeDto, {
      ingredients: [
        {
          name: 'Ambiguous Item',
          foodProductId: '550e8400-e29b-41d4-a716-446655440000',
          genericFoodId: '550e8400-e29b-41d4-a716-446655440001',
        },
      ],
    });
    const errors = await validate(dto);
    const messages = errors.flatMap((e) =>
      (e.children ?? []).flatMap((child) =>
        (child.children ?? []).flatMap((c) =>
          Object.values(c.constraints ?? {}),
        ),
      ),
    );
    expect(messages).toContain(
      'Only one of foodProductId or genericFoodId can be provided, not both',
    );
  });
});
