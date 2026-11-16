import { parseQuantityUnit } from '../../../scripts/seeds/prod/measure-parser';
import {
  calculateRecipeNutrition,
  NutritionIngredient,
} from './calculate-recipe-nutrition';

type Food = NonNullable<NutritionIngredient['genericFood']>;

const item = (
  name: string,
  measure: string | null,
  genericFood: Food | null = null,
): NutritionIngredient => ({
  name,
  measure,
  ...(measure ? parseQuantityUnit(measure) : null),
  genericFood,
});

const nutritionOf = (...ingredients: NutritionIngredient[]) =>
  calculateRecipeNutrition({ ingredients });

const kcalPer100g = (...ingredients: NutritionIngredient[]) =>
  nutritionOf(...ingredients)?.per100g.energyKcal;

const beef = item('Beef', '500g', { energyKcal: 200 });

describe('calculateRecipeNutrition', () => {
  it('returns null when there are no ingredients', () => {
    expect(nutritionOf()).toBeNull();
  });

  it('reports a weighed ingredient per 100 g', () => {
    expect(nutritionOf(item('Chicken', '200g', { energyKcal: 120 }))).toEqual({
      per100g: { energyKcal: 120 },
      estimated: true,
      missingIngredients: [],
    });
  });

  it('does not read an amount from the measure text', () => {
    expect(
      nutritionOf({
        name: 'Flour',
        measure: '200g',
        genericFood: { energyKcal: 345 },
      }),
    ).toBeNull();
  });

  it('leaves out a nutrient that a counted ingredient has no value for', () => {
    expect(
      nutritionOf(
        item('Chicken', '100g', { energyKcal: 120, fat: 3, vitaminA: null }),
        item('Rice', '100g', {
          energyKcal: 130,
          fat: 1,
          vitaminA: 5,
          fiber: 2,
        }),
      )?.per100g,
    ).toEqual({ energyKcal: 125, fat: 2 });
  });

  describe('which linked food counts', () => {
    it.each([
      ['the product', 90, 90],
      ['the generic food when the product has no energy value', null, 60],
    ])('uses %s', (_, productKcal, expected) => {
      expect(
        kcalPer100g({
          ...item('Yoghurt', '100g', { energyKcal: 60 }),
          foodProduct: { energyKcal: productKcal },
        }),
      ).toBe(expected);
    });

    it('treats a product without an energy value as not linked', () => {
      expect(
        nutritionOf(beef, {
          ...item('Protein bar', '100g'),
          foodProduct: { energyKcal: null, fat: 10 },
        }),
      ).toBeNull();
    });
  });

  describe('ingredients without a measured amount', () => {
    it('counts a condiment as 1 g and lists it', () => {
      const result = nutritionOf(
        item('Chicken', '100g', { energyKcal: 165, sodium: 74 }),
        item('Salt', 'to taste', { energyKcal: 0, sodium: 38758 }),
      );

      expect(result?.per100g).toEqual({ energyKcal: 163.4, sodium: 457 });
      expect(result?.missingIngredients).toEqual(['Salt']);
    });

    it('recognises a condiment by its linked food when the name is not English', () => {
      const result = nutritionOf(
        item('Rindfleisch', '500g', { energyKcal: 200 }),
        item('Salz', null, {
          foodName: 'Salt not fortified w iodine',
          energyKcal: 0,
        }),
        item('Pfeffer', null, {
          foodName: 'Pepper black/white',
          energyKcal: 250,
        }),
      );

      expect(result?.per100g.energyKcal).toBe(199.7);
      expect(result?.missingIngredients).toEqual(['Salz', 'Pfeffer']);
    });

    it('guesses a low-energy food as 30 g, a vegetable pepper included', () => {
      expect(
        kcalPer100g(
          beef,
          item('Bird chilli pods', 'a few', { energyKcal: 40 }),
        ),
      ).toBe(190.9);
      expect(
        kcalPer100g(beef, item('Green pepper', 'to taste', { energyKcal: 20 })),
      ).toBe(189.8);
    });

    it.each([
      ['To serve', 0],
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
      const result = nutritionOf(
        item('Beef', '100g', { energyKcal: 200 }),
        item('Lemon zest', measure, { energyKcal: 0 }),
      );

      expect(result?.per100g.energyKcal).toBeCloseTo(20000 / (100 + grams), 1);
      expect(result?.missingIngredients).toEqual(['Lemon zest']);
    });

    it.each([
      ['Flour', null, 345],
      ['Butter', 'To taste', 740],
      ['Squid', 'cleaned', 73],
      ['Bacon', 'some', 400],
      ['Dragon fruit', '2', 260],
    ])(
      'withholds the recipe when %s (%s) cannot be weighed and is not low in energy',
      (name, measure, energyKcal) => {
        expect(
          nutritionOf(beef, item(name, measure, { energyKcal })),
        ).toBeNull();
      },
    );

    it.each([
      ['Chicken', '100g', 100, null],
      ['Chicken', '200g', 500, 519],
    ])(
      'withholds the recipe only when guesses are over 10% of energy (%s %s)',
      (name, measure, energyKcal, expected) => {
        expect(
          kcalPer100g(
            item(name, measure, { energyKcal }),
            item('Olive oil', 'drizzle', { energyKcal: 900 }),
          ) ?? null,
        ).toBe(expected);
      },
    );
  });

  describe('unlinked ingredients', () => {
    it.each([
      ['Baking powder', '1 tsp', 157.9],
      ['Fermented black beans', '1 tbsp', 151.4],
    ])('counts up to 15 g of %s by weight only', (name, measure, expected) => {
      const result = nutritionOf(
        item('Chicken', '100g', { energyKcal: 165 }),
        item(name, measure),
      );

      expect(result?.per100g.energyKcal).toBe(expected);
      expect(result?.missingIngredients).toEqual([name]);
    });

    it('withholds the recipe above 15 g', () => {
      expect(nutritionOf(beef, item('Olive oil', '1 cup'))).toBeNull();
    });
  });

  describe('water absorbed by dry staples', () => {
    const pasta = item('Spaghetti', '100g', {
      foodName: 'Pasta white raw',
      energyKcal: 350,
    });
    const water = (measure: string) =>
      item('Water', measure, { foodName: 'Water av', energyKcal: 0 });
    const mozzarella = item('Mozzarella Balls', '130g', {
      foodName: "Cheese Mozzarella made from cow's milk",
      energyKcal: 0,
    });
    const rice = item('Jasmine Rice', '100g', {
      foodName: 'Rice white raw',
      energyKcal: 350,
    });

    it.each([
      ['adds it when the recipe lists no liquid', [pasta], 152.2],
      ['adds only the shortfall', [pasta, water('100ml')], 152.2],
      ['adds nothing when the liquid covers it', [pasta, water('400ml')], 70],
      ['does not count cheese as liquid', [pasta, mozzarella], 97.2],
      ['uses a higher factor for rice', [rice], 125],
    ])('%s', (_, ingredients, expected) => {
      expect(kcalPer100g(...ingredients)).toBe(expected);
    });
  });

  it('weighs counted prawns so the oil does not stand in for the dish', () => {
    expect(
      kcalPer100g(
        item('Raw King Prawns', '12', {
          foodName: 'Prawns cooked',
          energyKcal: 70,
        }),
        item('Olive Oil', '20 ml', { foodName: 'Oil olive', energyKcal: 900 }),
      ),
    ).toBe(146.2);
  });
});
