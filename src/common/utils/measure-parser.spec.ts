import { parseQuantityUnit, MAX_MEASURE_LENGTH } from './measure-parser';

describe('adversarial input', () => {
  const inputs = [
    ['spaces', '1' + ' '.repeat(MAX_MEASURE_LENGTH - 2) + 'x'],
    ['fraction', '1' + ' '.repeat(MAX_MEASURE_LENGTH - 2) + '½'],
    ['digits', '1'.repeat(MAX_MEASURE_LENGTH - 1) + 'x'],
    ['spaced digits', '1 '.repeat(MAX_MEASURE_LENGTH / 2 - 1) + 'x'],
    ['over limit', ' '.repeat(100_000) + '½'],
  ];

  it.each(inputs)('parses %s quickly', (_, measure) => {
    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      parseQuantityUnit(measure);
    }
    expect(performance.now() - start).toBeLessThan(500);
  });
});

describe('parseQuantityUnit', () => {
  it.each([
    ['500g', 500, 'G'],
    ['1.5kg', 1.5, 'KG'],
    ['1,5 kg', 1.5, 'KG'],
    ['250 ml', 250, 'ML'],
    ['1 l', 1, 'L'],
    ['2 cups', 480, 'ML'],
    ['2-3 cups', 600, 'ML'],
    ['2-1/2 cups', 600, 'ML'],
    ['1-⅓ cups', 320, 'ML'],
    ['½ cup', 120, 'ML'],
    ['1 lb', 453.6, 'G'],
    ['8 oz', 226.8, 'G'],
    ['200g/7oz', 200, 'G'],
    ['2', 2, 'PIECES'],
    ['2 cloves minced', 2, 'PIECES'],
    ['1 large', 1, 'PIECES'],
    ['1 can', 1, 'PIECES'],
    ['2 PIECES', 2, 'PIECES'],
    ['500 G', 500, 'G'],
  ])('parses %s', (measure, quantity, unit) => {
    expect(parseQuantityUnit(measure)).toEqual({ quantity, unit });
  });

  it.each([
    ['2 tbsp', 30, 'ML'],
    ['1 tbs', 15, 'ML'],
    ['1 tblsp', 15, 'ML'],
    ['2 tablespoons', 30, 'ML'],
    ['1 ½ tbsp', 22.5, 'ML'],
    ['1 tsp', 5, 'ML'],
    ['½ tsp', 2.5, 'ML'],
    ['3 teaspoons', 15, 'ML'],
    ['1 TBSP', 15, 'ML'],
  ])('converts spoon measure %s to ml', (measure, quantity, unit) => {
    expect(parseQuantityUnit(measure)).toEqual({ quantity, unit });
  });

  it.each([
    'to taste',
    'bunch',
    '1  bunch',
    'small bunch',
    '1/2 handful',
    '1 dash',
    '1 pinch',
    'handful',
    'chopped',
    'juice of 1',
    'zest and juice of 1',
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
