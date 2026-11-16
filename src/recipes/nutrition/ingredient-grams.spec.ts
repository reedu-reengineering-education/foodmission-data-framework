import { lookup, quantityToGrams, wordTable } from './ingredient-grams';

describe('lookup', () => {
  const table = wordTable({ egg: 50, 'egg yolk': 17, 'mint|dill': 1 });

  it('matches whole words and their plurals', () => {
    expect(lookup(table, ['Eggs'])).toBe(50);
    expect(lookup(table, ['Eggplant'])).toBeUndefined();
  });

  it('prefers the longest word', () => {
    expect(lookup(table, ['Egg Yolks'])).toBe(17);
  });

  it('keeps alternatives inside word boundaries', () => {
    expect(lookup(table, ['Mint'])).toBe(1);
    expect(lookup(table, ['Spearmint'])).toBeUndefined();
  });

  it('tries the texts in order', () => {
    expect(lookup(table, [null, 'Zutat', 'Egg whole raw'])).toBe(50);
  });
});

describe('count words', () => {
  it('weighs plural count words like the singular', () => {
    expect(
      quantityToGrams(
        { quantity: 3, unit: 'PIECES' },
        ['Tomato Puree'],
        '3 cans',
      ),
    ).toBe(1200);
    expect(
      quantityToGrams({ quantity: 4, unit: 'PIECES' }, ['Thyme'], '4 sprigs'),
    ).toBe(8);
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
