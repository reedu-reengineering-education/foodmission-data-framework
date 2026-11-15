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
  it('returns null when there are no ingredients', () => {
    expect(calculateRecipeNutrition({ ingredients: [] })).toBeNull();
  });

  it('scales a weighed ingredient and reports it per 100 g', () => {
    const result = calculateRecipeNutrition({
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
    expect(result?.per100g?.energyKcal).toBe(120);
    expect(result?.confidence).toBe(1);
  });

  it('estimates a vague condiment and records its name', () => {
    const result = calculateRecipeNutrition({
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
        ingredients: [food('Flour', null, { energyKcal: 345 })],
      }),
    ).toBeNull();
  });

  it('guesses an unweighable low-energy food so one chilli does not drop the recipe', () => {
    const result = calculateRecipeNutrition({
      ingredients: [
        food('Beef', '500g', { energyKcal: 200 }),
        food('Bird chilli pods', 'a few', { energyKcal: 40 }),
      ],
    });

    expect(result?.energyKcal).toBe(1012);
    expect(result?.missingIngredients).toEqual(['Bird chilli pods']);
  });

  it('recognises a condiment by its linked food when the name is not English', () => {
    const result = calculateRecipeNutrition({
      ingredients: [
        food('Rindfleisch', '500g', { energyKcal: 200 }),
        {
          name: 'Salz',
          measure: null,
          genericFood: {
            foodName: 'Salt not fortified w iodine',
            energyKcal: 0,
          },
        },
        {
          name: 'Pfeffer',
          measure: null,
          genericFood: { foodName: 'Pepper black/white', energyKcal: 250 },
        },
      ],
    });

    expect(result?.energyKcal).toBe(1002.5);
    expect(result?.missingIngredients).toEqual(['Salz', 'Pfeffer']);
  });

  it.each(['Caraway Seed', 'Cream of Tartar', 'Sumac'])(
    'disregards a small amount of an unlinked spice or flavouring (%s)',
    (name) => {
      const result = calculateRecipeNutrition({
        ingredients: [
          food('Beef', '500g', { energyKcal: 200 }),
          { name, measure: '1 tbsp' },
        ],
      });

      expect(result?.energyKcal).toBe(1000);
      expect(result?.missingIngredients).toEqual([name]);
    },
  );

  it('uses the linked product over the generic food when both are set', () => {
    const result = calculateRecipeNutrition({
      ingredients: [
        {
          name: 'Yoghurt',
          measure: '100g',
          foodProduct: { energyKcal: 90 },
          genericFood: { energyKcal: 60 },
        },
      ],
    });

    expect(result?.energyKcal).toBe(90);
  });

  it('leaves out what is served alongside the dish', () => {
    const result = calculateRecipeNutrition({
      ingredients: [
        food('Beef', '500g', { energyKcal: 200 }),
        food('Rice', 'To serve', { energyKcal: 352 }),
      ],
    });

    expect(result?.energyKcal).toBe(1000);
    expect(result?.per100g?.energyKcal).toBe(200);
    expect(result?.missingIngredients).toEqual(['Rice']);
  });

  it.each([
    ['Pinch', 0.5],
    ['1 dash', 1],
    ['Sprinkling', 5],
    ['Dusting', 5],
    ['Garnish', 5],
    ['For Greasing', 10],
    ['Drizzle', 10],
    ['Splash', 15],
    ['To Glaze', 20],
    ['Topping', 20],
  ])('counts "%s" as %d g', (measure, grams) => {
    const result = calculateRecipeNutrition({
      ingredients: [
        food('Beef', '1kg', { energyKcal: 200 }),
        food('Butter', measure, { energyKcal: 700 }),
      ],
    });

    expect(result?.energyKcal).toBe(2000 + grams * 7);
    expect(result?.missingIngredients).toEqual(['Butter']);
  });

  it('still withholds a dense food whose amount is simply missing', () => {
    expect(
      calculateRecipeNutrition({
        ingredients: [
          food('Beef', '500g', { energyKcal: 200 }),
          food('Butter', 'To taste', { energyKcal: 740 }),
        ],
      }),
    ).toBeNull();
  });

  it('returns null when an unweighable food is energy-dense', () => {
    expect(
      calculateRecipeNutrition({
        ingredients: [
          food('Beef', '500g', { energyKcal: 200 }),
          food('Bacon', 'some', { energyKcal: 400 }),
        ],
      }),
    ).toBeNull();
  });

  it('returns null when a piece has no known weight', () => {
    expect(
      calculateRecipeNutrition({
        ingredients: [food('Dragon fruit', '2', { energyKcal: 260 })],
      }),
    ).toBeNull();
  });

  it('returns null when guessed condiments are more than 10% of energy', () => {
    const result = calculateRecipeNutrition({
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
      ingredients: [
        food('Chicken', '200g', { energyKcal: 500 }),
        food('Olive oil', 'drizzle', { energyKcal: 900 }),
      ],
    });

    expect(result?.energyKcal).toBe(1090);
    expect(result?.missingIngredients).toEqual(['Olive oil']);
  });

  it('does not guess a vegetable pepper as a pinch of spice', () => {
    expect(
      calculateRecipeNutrition({
        ingredients: [food('Green pepper', 'to taste', { energyKcal: 20 })],
      }),
    ).toBeNull();
  });
});
