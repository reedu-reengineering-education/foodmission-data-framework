import {
  parseFraction,
  parseQuantityUnit,
  quantityToGrams,
  MAX_MEASURE_LENGTH,
} from './measure-parser';

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

describe('parseFraction', () => {
  it('parses integer', () => {
    expect(parseFraction('3')).toBe(3);
  });

  it('parses decimal', () => {
    expect(parseFraction('1.5')).toBe(1.5);
  });

  it('parses simple fraction', () => {
    expect(parseFraction('1/2')).toBe(0.5);
  });

  it('parses quarter fraction', () => {
    expect(parseFraction('1/4')).toBe(0.25);
  });

  it('parses three-quarters fraction', () => {
    expect(parseFraction('3/4')).toBe(0.75);
  });

  it('parses mixed number', () => {
    expect(parseFraction('2 1/2')).toBe(2.5);
  });

  it('parses range as midpoint', () => {
    expect(parseFraction('4-5')).toBe(4.5);
  });

  it('parses range with spaces', () => {
    expect(parseFraction('4 - 5')).toBe(4.5);
  });

  it('returns 0 for empty string', () => {
    expect(parseFraction('')).toBe(0);
  });

  it('returns 0 for invalid input', () => {
    expect(parseFraction('abc')).toBe(0);
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

describe('quantityToGrams', () => {
  it('falls back to the linked food name when the ingredient name is not English', () => {
    expect(
      quantityToGrams({ quantity: 240, unit: 'ML' }, [
        'Mandeln',
        'Almonds w skin unsalted',
      ]),
    ).toBeCloseTo(141.6, 1);
    expect(
      quantityToGrams({ quantity: 2, unit: 'PIECES' }, [
        'Zwiebel',
        'Onions raw',
      ]),
    ).toBe(300);
  });

  it.each([
    ['Chocolate Chips', 170],
    ['Miniature Marshmallows', 43],
    ['Shredded Monterey Jack Cheese', 113],
    ['Cream Cheese', 228],
    ['Coconut Milk', 240],
    ['Desiccated Coconut', 84],
    ['Mushrooms', 79],
    ['Peanut Butter', 269],
  ])('weighs a cup of %s as about %d g', (name, grams) => {
    const result = quantityToGrams({ quantity: 240, unit: 'ML' }, [name]);
    expect(result).toBeCloseTo(grams, 0);
  });

  it('converts a cup of milk as 240 ml at water density', () => {
    const result = quantityToGrams(
      { quantity: 240, unit: 'ML' },
      ['Milk'],
      '1 cup',
    );
    expect(result).toBe(240);
  });

  it('does not weigh a cup of nuts like a cup of water', () => {
    const result = quantityToGrams(
      { quantity: 240, unit: 'ML' },
      ['Almonds'],
      '1 cup',
    );
    expect(result).toBeCloseTo(141.6, 1);
  });

  it('does not weigh a lemongrass stalk as a lemon', () => {
    expect(
      quantityToGrams(
        { quantity: 2, unit: 'PIECES' },
        ['Lemongrass Stalks'],
        '2',
      ),
    ).toBe(30);
  });

  it('weighs egg yolks and whites as parts of an egg', () => {
    expect(
      quantityToGrams({ quantity: 6, unit: 'PIECES' }, ['Egg Yolks'], '6'),
    ).toBe(102);
    expect(
      quantityToGrams({ quantity: 2, unit: 'PIECES' }, ['Egg White'], '2'),
    ).toBe(66);
    expect(
      quantityToGrams({ quantity: 2, unit: 'PIECES' }, ['Eggs'], '2'),
    ).toBe(100);
  });

  it('weighs grams as they are', () => {
    expect(quantityToGrams({ quantity: 500, unit: 'G' }, ['Beef'])).toBe(500);
  });

  it('scales a known food by small, medium or large', () => {
    const result = quantityToGrams(
      { quantity: 2, unit: 'PIECES' },
      ['Onion'],
      '2 large',
    );
    expect(result).toBe(390);
  });

  it('converts a cup of flour with flour density', () => {
    const result = quantityToGrams(
      { quantity: 240, unit: 'ML' },
      ['Flour'],
      '1 cup',
    );
    expect(result).toBeCloseTo(120, 1);
  });

  it('converts oil by density rather than 1 g per ml', () => {
    const result = quantityToGrams(
      { quantity: 30, unit: 'ML' },
      ['Olive oil'],
      '2 tablespoons',
    );
    expect(result).toBeCloseTo(27.3, 1);
  });

  it('uses a count word from the original measure', () => {
    const result = quantityToGrams(
      { quantity: 1, unit: 'PIECES' },
      ['Tomatoes'],
      '1 can',
    );
    expect(result).toBe(400);
  });

  it('uses the piece-weight table for a known food', () => {
    const result = quantityToGrams(
      { quantity: 2, unit: 'PIECES' },
      ['Egg'],
      '2',
    );
    expect(result).toBe(100);
  });

  it('returns null for a piece with no known weight', () => {
    expect(
      quantityToGrams({ quantity: 1, unit: 'PIECES' }, ['Dragon fruit'], '1'),
    ).toBeNull();
  });

  it('does not treat black pepper as a 150 g vegetable', () => {
    expect(
      quantityToGrams({ quantity: 1, unit: 'PIECES' }, ['Black pepper'], '1'),
    ).toBeNull();
  });
});
