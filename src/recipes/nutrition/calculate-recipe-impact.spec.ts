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

const impactOf = (
  servings: number | null,
  ...ingredients: NutritionIngredient[]
) => estimateRecipe({ ingredients, servings }).environmentalImpact;

const beef = item('Beef', '500g', {
  foodName: 'Beef stewing meat cooked',
  agribalyseFood: agribalyse(28.9, 2.5, 2.8),
});
const onion = item('Onion', '500g', {
  foodName: 'Onions raw',
  agribalyseFood: agribalyse(0.421, 0.0487, 2.4),
});

describe('calculateRecipeImpact', () => {
  it('reports CO2 and EF score per kg of dish and per serving', () => {
    expect(impactOf(4, beef, onion)).toEqual({
      perKg: { co2: 14.66, efScoreMpt: 1274.4 },
      perServing: { co2: 3.665, efScoreMpt: 318.6 },
      coverage: 1,
      dqr: 2.6,
      source: 'AGRIBALYSE 3.2',
    });
  });

  it('divides by the cooked dish weight', () => {
    expect(
      impactOf(
        null,
        item('Beef', '400g', {
          foodName: 'Beef stewing meat raw',
          foodGroup: 'Meat and poultry',
          agribalyseFood: agribalyse(28.9, 2.5),
        }),
      )?.perKg.co2,
    ).toBe(38.533);
  });

  it('leaves out per serving when servings are unknown', () => {
    expect(impactOf(null, beef)?.perServing).toBeNull();
  });

  it('prefers the product AGRIBALYSE value over the generic food', () => {
    expect(
      impactOf(null, {
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
      null,
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
    expect(impactOf(4, ...ingredients)).toBeNull();
  });
});
