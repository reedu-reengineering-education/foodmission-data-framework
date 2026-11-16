import { parseQuantityUnit } from '../../../scripts/seeds/prod/measure-parser';
import { calculateRecipeCarbonFootprint } from './calculate-recipe-carbon';
import { NutritionIngredient } from './calculate-recipe-nutrition';

type Food = NonNullable<NutritionIngredient['genericFood']>;

const item = (
  name: string,
  measure: string,
  genericFood: Food | null = null,
): NutritionIngredient => ({
  name,
  measure,
  ...parseQuantityUnit(measure),
  genericFood,
});

const carbonOf = (...ingredients: NutritionIngredient[]) =>
  calculateRecipeCarbonFootprint({ ingredients });

const beef = item('Beef', '500g', { energyKcal: 250, carbonFootprint: 28.9 });
const onion = item('Onion', '100g', { energyKcal: 40, carbonFootprint: 0.421 });

describe('calculateRecipeCarbonFootprint', () => {
  it('returns kg CO2 eq per kg of the dish', () => {
    expect(carbonOf(beef, onion)).toBe(24.15);
  });

  it('dilutes dry pasta by the water it absorbs', () => {
    expect(
      carbonOf(
        item('Spaghetti', '100g', {
          foodName: 'Pasta white raw',
          energyKcal: 350,
          carbonFootprint: 1.98,
        }),
      ),
    ).toBe(0.86);
  });

  it('ignores what is served alongside the dish', () => {
    expect(
      carbonOf(beef, onion, item('Rice', 'To serve', { energyKcal: 352 })),
    ).toBe(24.15);
  });

  it('counts up to 15 g of an unlinked ingredient by weight only', () => {
    expect(carbonOf(beef, onion, item('Baking powder', '10g'))).toBe(23.76);
  });

  it.each([
    [
      'a linked food has no carbon footprint',
      item('Leek', '100g', { energyKcal: 30 }),
    ],
    ['an unlinked ingredient is over 15 g', item('Olive oil', '1 cup')],
    [
      'an ingredient is linked only to a food product',
      {
        ...item('Yoghurt', '150g'),
        foodProduct: { name: 'Greek yoghurt', energyKcal: 97 },
      },
    ],
    [
      'an ingredient cannot be weighed',
      item('Butter', 'To taste', { energyKcal: 740, carbonFootprint: 7.94 }),
    ],
  ])('returns null when %s', (_, ingredient) => {
    expect(carbonOf(beef, onion, ingredient)).toBeNull();
  });

  it('returns null for a recipe without ingredients', () => {
    expect(carbonOf()).toBeNull();
  });
});
