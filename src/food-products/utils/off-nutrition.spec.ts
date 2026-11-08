import { extractOffNutrition, extractOffNutritionPer } from './off-nutrition';

describe('extractOffNutrition', () => {
  it('reads legacy nutriments, preferring _100g and keeping zeros', () => {
    expect(
      extractOffNutrition({
        nutriments: { fat_100g: 1.5, fat: 9, salt_100g: 0, proteins: 14 },
      }),
    ).toEqual({ fat: 1.5, salt: 0, proteins: 14 });
  });

  it('reads the schema 1003+ aggregated set when nutriments is empty', () => {
    expect(
      extractOffNutrition({
        nutriments: {},
        nutrition: {
          aggregated_set: {
            per: '100g',
            nutrients: {
              'energy-kcal': { value: 351, unit: 'kcal', source: 'packaging' },
              fat: { value: 1.5, unit: 'g', source: 'manufacturer' },
              salt: { value: 0, unit: 'g', source: 'packaging' },
              'vitamin-c': { value: 12, unit: 'mg', source: 'packaging' },
              iron: { value: 0.0009, unit: 'g', source: 'estimate' },
            },
          },
        },
      }),
    ).toEqual({ energyKcal: 351, fat: 1.5, salt: 0, vitaminC: 0.012 });
  });

  it('ignores an aggregated set not given per 100 g/ml', () => {
    expect(
      extractOffNutrition({
        nutrition: {
          aggregated_set: {
            per: 'serving',
            nutrients: { fat: { value: 3, unit: 'g' } },
          },
        },
      }),
    ).toBeUndefined();
  });

  it('returns undefined without any nutrition data', () => {
    expect(extractOffNutrition({ nutriments: {} })).toBeUndefined();
  });
});

describe('extractOffNutritionPer', () => {
  it('returns the aggregated set basis', () => {
    expect(
      extractOffNutritionPer({
        nutrition: { aggregated_set: { per: '100ml' } },
      }),
    ).toBe('100ml');
  });
});
