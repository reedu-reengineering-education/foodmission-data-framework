import { parseQuantityUnit } from '../../../scripts/seeds/prod/measure-parser';
import {
  ImpactSource,
  NutritionIngredient,
} from './calculate-recipe-nutrition';
import { estimateRecipe } from './estimate-recipe';

const agribalyse = (
  co2PerKg: number,
  efScorePerKg: number,
  dqr = 2,
): ImpactSource => ({ co2PerKg, efScorePerKg, dqr, version: '3.2' });

const item = (
  name: string,
  measure: string,
  food: Partial<NonNullable<NutritionIngredient['genericFood']>> | null,
): NutritionIngredient => ({
  name,
  measure,
  ...parseQuantityUnit(measure),
  genericFood: food && { energyKcal: 100, ...food },
});

const impactOf = (...ingredients: NutritionIngredient[]) =>
  estimateRecipe({ ingredients }).environmentalImpact;

const beef = item('Beef', '500g', {
  foodName: 'Beef stewing meat cooked',
  agribalyseFood: agribalyse(28.9, 2.5, 2.8),
});
const onion = item('Onion', '500g', {
  foodName: 'Onions raw',
  agribalyseFood: agribalyse(0.421, 0.0487, 2.4),
});

describe('calculateRecipeImpact', () => {
  it('reports CO2 and EF score per kg of dish', () => {
    expect(impactOf(beef, onion)).toEqual({
      perKg: { co2: 14.66, efScoreMpt: 1.274 },
      coverage: 1,
      dqr: 2.6,
      source: 'AGRIBALYSE 3.2',
    });
  });

  it('gives a single cooked ingredient its own AGRIBALYSE values per kg', () => {
    expect(
      impactOf(
        item('Lentils', '300g', {
          foodName: 'Lentils boiled',
          agribalyseFood: agribalyse(0.585, 0.083),
        }),
      )?.perKg,
    ).toEqual({ co2: 0.585, efScoreMpt: 0.083 });
  });

  it('divides by the cooked dish weight', () => {
    expect(
      impactOf(
        item('Beef', '400g', {
          foodName: 'Beef stewing meat raw',
          foodGroup: 'Meat and poultry',
          agribalyseFood: agribalyse(28.9, 2.5),
        }),
      )?.perKg.co2,
    ).toBe(38.533);
  });

  it('prefers the product AGRIBALYSE value over the generic food', () => {
    expect(
      impactOf({
        ...beef,
        foodProduct: {
          energyKcal: 100,
          agribalyseFood: agribalyse(10, 1),
        },
      })?.perKg.co2,
    ).toBe(10);
  });

  it('accepts up to 5% of the weight without AGRIBALYSE data', () => {
    const impact = impactOf(
      item('Beef', '960g', {
        foodName: 'Beef cooked',
        agribalyseFood: agribalyse(30, 3),
      }),
      item('Baking powder', '10g', null),
      item('Mushrooms', '30g', { foodName: 'Mushroom' }),
    );

    expect(impact?.coverage).toBe(0.96);
    expect(impact?.perKg.co2).toBe(28.8);
  });

  it.each([
    [
      'more than 5% of the weight has no AGRIBALYSE data',
      [beef, item('Mushrooms', '100g', { foodName: 'Mushroom' })],
    ],
    [
      'an ingredient cannot be weighed',
      [beef, item('Butter', 'To taste', { energyKcal: 740 })],
    ],
    ['there are no ingredients', []],
  ])('returns null when %s', (_, ingredients) => {
    expect(impactOf(...ingredients)).toBeNull();
  });
});
