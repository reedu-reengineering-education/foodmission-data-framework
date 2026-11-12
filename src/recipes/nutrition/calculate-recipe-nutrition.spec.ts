import { Unit } from '@prisma/client';
import {
  calculateRecipeNutrition,
  NutritionIngredient,
} from './calculate-recipe-nutrition';

function food(
  name: string,
  measure: string | null,
  per100g: { energyKcal: number; fat?: number; sodium?: number },
  extra: Partial<NutritionIngredient> = {},
): NutritionIngredient {
  return {
    name,
    measure,
    foodProduct: null,
    genericFood: {
      energyKcal: per100g.energyKcal,
      fat: per100g.fat ?? 0,
      sodium: per100g.sodium ?? 0,
    },
    ...extra,
  };
}

describe('calculateRecipeNutrition', () => {
  it('returns an empty result when there are no ingredients', () => {
    expect(calculateRecipeNutrition({ servings: 4, ingredients: [] })).toEqual({
      confidence: 0,
      missingIngredients: [],
    });
  });

  it('scales a weighed ingredient and divides by servings', () => {
    const result = calculateRecipeNutrition({
      servings: 2,
      ingredients: [
        food(
          'Chicken',
          '200g',
          { energyKcal: 120 },
          { quantity: 200, unit: Unit.G },
        ),
      ],
    });

    expect(result?.energyKcal).toBe(240);
    expect(result?.perServing?.energyKcal).toBe(120);
    expect(result?.confidence).toBe(1);
  });

  it('estimates a vague condiment and records its name', () => {
    const result = calculateRecipeNutrition({
      servings: 1,
      ingredients: [
        food('Chicken', '100g', { energyKcal: 165, sodium: 74 }),
        food('Salt', 'to taste', { energyKcal: 0, sodium: 38758 }),
      ],
    });

    expect(result?.energyKcal).toBe(165);
    expect(result?.sodium).toBe(461.6);
    expect(result?.missingIngredients).toEqual(['Salt']);
  });

  it('ignores a small unmapped condiment that did parse', () => {
    const result = calculateRecipeNutrition({
      servings: 1,
      ingredients: [
        food('Chicken', '100g', { energyKcal: 165 }),
        {
          name: 'Baking powder',
          measure: '1 tsp',
          foodProduct: null,
          genericFood: null,
        },
      ],
    });

    expect(result?.energyKcal).toBe(165);
    expect(result?.missingIngredients).toEqual(['Baking powder']);
  });

  it('returns null when an unlinked condiment is more than a tablespoon', () => {
    expect(
      calculateRecipeNutrition({
        servings: 1,
        ingredients: [
          food('Chicken', '100g', { energyKcal: 165 }),
          {
            name: 'Olive oil',
            measure: '1 cup',
            foodProduct: null,
            genericFood: null,
          },
        ],
      }),
    ).toBeNull();
  });

  it('treats an unmapped condiment as zero and still totals the recipe', () => {
    const result = calculateRecipeNutrition({
      servings: 1,
      ingredients: [
        food('Chicken', '100g', { energyKcal: 165 }),
        {
          name: 'Bay leaf',
          measure: 'to taste',
          foodProduct: null,
          genericFood: null,
        },
      ],
    });

    expect(result?.energyKcal).toBe(165);
    expect(result?.missingIngredients).toEqual(['Bay leaf']);
  });

  it('returns null when a non-condiment has no amount', () => {
    expect(
      calculateRecipeNutrition({
        servings: 1,
        ingredients: [food('Flour', null, { energyKcal: 345 })],
      }),
    ).toBeNull();
  });

  it('returns null when a piece has no known weight', () => {
    expect(
      calculateRecipeNutrition({
        servings: 1,
        ingredients: [food('Dragon fruit', '2', { energyKcal: 60 })],
      }),
    ).toBeNull();
  });

  it('returns null when guessed condiments are more than 10% of energy', () => {
    const result = calculateRecipeNutrition({
      servings: 1,
      ingredients: [
        food('Chicken', '100g', { energyKcal: 100 }),
        food('Olive oil', 'drizzle', { energyKcal: 900, fat: 100 }),
      ],
    });

    // 5 g oil = 45 kcal, chicken = 100 kcal, oil is 31% of energy.
    expect(result).toBeNull();
  });

  it('keeps a recipe when the condiment guess is under 10% of energy', () => {
    const result = calculateRecipeNutrition({
      servings: 1,
      ingredients: [
        food('Chicken', '100g', { energyKcal: 500 }),
        food('Olive oil', 'drizzle', { energyKcal: 900 }),
      ],
    });

    // 5 g oil = 45 kcal of 545, about 8%.
    expect(result?.energyKcal).toBe(545);
    expect(result?.missingIngredients).toEqual(['Olive oil']);
  });

  it('does not guess a vegetable pepper as a pinch of spice', () => {
    expect(
      calculateRecipeNutrition({
        servings: 1,
        ingredients: [food('Green pepper', 'to taste', { energyKcal: 20 })],
      }),
    ).toBeNull();
  });
});
