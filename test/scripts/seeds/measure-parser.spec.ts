import { parseQuantityUnit } from '../../../scripts/seeds/prod/measure-parser';

describe('parseQuantityUnit', () => {
  it.each([
    ['500g', 500, 'G'],
    ['1.5kg', 1.5, 'KG'],
    ['1,5 kg', 1.5, 'KG'],
    ['1 lb', 453.6, 'G'],
    ['8 oz', 226.8, 'G'],
    ['200g/7oz', 200, 'G'],
    ['250 ml', 250, 'ML'],
    ['1 l', 1, 'L'],
    ['2 cups', 480, 'ML'],
    ['½ cup', 120, 'ML'],
    ['2-3 cups', 600, 'ML'],
    ['2-1/2 cups', 600, 'ML'],
    ['1-⅓ cups', 320, 'ML'],
    ['2 tablespoons', 30, 'ML'],
    ['1 TBSP', 15, 'ML'],
    ['1 tblsp', 15, 'ML'],
    ['1 ½ tbsp', 22.5, 'ML'],
    ['3 teaspoons', 15, 'ML'],
    ['½ tsp', 2.5, 'ML'],
    ['2', 2, 'PIECES'],
    ['6-8 slices', 7, 'PIECES'],
    ['2 cloves minced', 2, 'PIECES'],
    ['1 large', 1, 'PIECES'],
  ])('parses %s', (measure, quantity, unit) => {
    expect(parseQuantityUnit(measure)).toEqual({ quantity, unit });
  });

  it.each([
    'to taste',
    '1 bunch',
    '1/2 handful',
    '1 pinch',
    'chopped',
    'juice of 1',
    '3cm piece',
    '2 x 400g',
    '4 qt',
    '2 quarts',
    '2 pint',
    '0',
  ])('returns null for %s', (measure) => {
    expect(parseQuantityUnit(measure)).toBeNull();
  });
});
