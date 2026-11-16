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

    expect(result).toEqual({
      per100g: expect.objectContaining({ energyKcal: 120 }),
      estimated: true,
      missingIngredients: [],
    });
  });

  it('estimates a vague condiment and records its name', () => {
    const result = calculateRecipeNutrition({
      ingredients: [
        food('Chicken', '100g', { energyKcal: 165, sodium: 74 }),
        food('Salt', 'to taste', { energyKcal: 0, sodium: 38758 }),
      ],
    });

    expect(result?.per100g.energyKcal).toBe(163.4);
    expect(result?.per100g.sodium).toBe(457);
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

    expect(result?.per100g.energyKcal).toBe(157.9);
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

    expect(result?.per100g.energyKcal).toBe(163.4);
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

    expect(result?.per100g.energyKcal).toBe(190.9);
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

    expect(result?.per100g.energyKcal).toBe(199.7);
    expect(result?.missingIngredients).toEqual(['Salz', 'Pfeffer']);
  });

  it.each([
    ['Caraway Seed', 196.5],
    ['Cream of Tartar', 194.2],
    ['Sumac', 196.5],
  ])(
    'counts a small unlinked spice or flavouring (%s) by weight only',
    (name, kcalPer100g) => {
      const result = calculateRecipeNutrition({
        ingredients: [
          food('Beef', '500g', { energyKcal: 200 }),
          { name, measure: '1 tbsp' },
        ],
      });

      expect(result?.per100g.energyKcal).toBe(kcalPer100g);
      expect(result?.missingIngredients).toEqual([name]);
    },
  );

  it('leaves out a nutrient that a counted ingredient has no value for', () => {
    const result = calculateRecipeNutrition({
      ingredients: [
        {
          name: 'Chicken',
          measure: '100g',
          genericFood: { energyKcal: 120, fat: 3, vitaminA: null },
        },
        {
          name: 'Rice',
          measure: '100g',
          genericFood: { energyKcal: 130, fat: 1, vitaminA: 5, fiber: 2 },
        },
      ],
    });

    expect(result?.per100g).toEqual({ energyKcal: 125, fat: 2 });
  });

  it('treats a linked food without an energy value as not linked', () => {
    expect(
      calculateRecipeNutrition({
        ingredients: [
          food('Beef', '500g', { energyKcal: 200 }),
          {
            name: 'Protein bar',
            measure: '100g',
            foodProduct: { name: 'Protein bar', energyKcal: null, fat: 10 },
          },
        ],
      }),
    ).toBeNull();
  });

  it('falls back to the generic food when the product has no energy value', () => {
    const result = calculateRecipeNutrition({
      ingredients: [
        {
          name: 'Yoghurt',
          measure: '100g',
          foodProduct: { energyKcal: null },
          genericFood: { energyKcal: 60 },
        },
      ],
    });

    expect(result?.per100g.energyKcal).toBe(60);
  });

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

    expect(result?.per100g.energyKcal).toBe(90);
  });

  describe('water absorbed by dry pasta and rice', () => {
    const dryPasta = (measure: string): NutritionIngredient => ({
      name: 'Spaghetti',
      measure,
      genericFood: { foodName: 'Pasta white raw', energyKcal: 350 },
    });
    const water = (measure: string): NutritionIngredient => ({
      name: 'Water',
      measure,
      genericFood: { foodName: 'Water av', energyKcal: 0 },
    });

    it('adds the cooking water to the dish weight when the recipe lists none', () => {
      const result = calculateRecipeNutrition({
        ingredients: [dryPasta('100g')],
      });

      expect(result?.per100g.energyKcal).toBeCloseTo(152.2, 1);
    });

    it('adds only the shortfall when the recipe lists some liquid', () => {
      const result = calculateRecipeNutrition({
        ingredients: [dryPasta('100g'), water('100ml')],
      });

      expect(result?.per100g.energyKcal).toBeCloseTo(152.2, 1);
    });

    it('adds nothing when the listed liquid already covers it', () => {
      const result = calculateRecipeNutrition({
        ingredients: [dryPasta('100g'), water('400ml')],
      });

      expect(result?.per100g.energyKcal).toBe(70);
    });

    it('does not count cheese or chocolate as cooking liquid', () => {
      const result = calculateRecipeNutrition({
        ingredients: [
          dryPasta('100g'),
          {
            name: 'Mozzarella Balls',
            measure: '130g',
            genericFood: {
              foodName: "Cheese Mozzarella made from cow's milk",
              energyKcal: 0,
            },
          },
        ],
      });

      expect(result?.per100g.energyKcal).toBeCloseTo(97.2, 1);
    });

    it('uses a higher factor for rice', () => {
      const result = calculateRecipeNutrition({
        ingredients: [
          {
            name: 'Jasmine Rice',
            measure: '100g',
            genericFood: { foodName: 'Rice white raw', energyKcal: 350 },
          },
        ],
      });

      expect(result?.per100g.energyKcal).toBe(125);
    });
  });

  it('leaves out what is served alongside the dish', () => {
    const result = calculateRecipeNutrition({
      ingredients: [
        food('Beef', '500g', { energyKcal: 200 }),
        food('Rice', 'To serve', { energyKcal: 352 }),
      ],
    });

    expect(result?.per100g.energyKcal).toBe(200);
    expect(result?.missingIngredients).toEqual(['Rice']);
  });

  it.each([
    ['Pinch', 0.5, 199],
    ['1 dash', 1, 198],
    ['Sprinkling', 5, 190.5],
    ['Dusting', 5, 190.5],
    ['Garnish', 5, 190.5],
    ['For Greasing', 10, 181.8],
    ['Drizzle', 10, 181.8],
    ['Splash', 15, 173.9],
    ['To Glaze', 20, 166.7],
    ['Topping', 20, 166.7],
  ])('counts "%s" as %d g', (measure, _grams, kcalPer100g) => {
    const result = calculateRecipeNutrition({
      ingredients: [
        food('Beef', '100g', { energyKcal: 200 }),
        food('Lemon zest', measure, { energyKcal: 0 }),
      ],
    });

    expect(result?.per100g.energyKcal).toBe(kcalPer100g);
    expect(result?.missingIngredients).toEqual(['Lemon zest']);
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

    expect(result?.per100g.energyKcal).toBe(519);
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
