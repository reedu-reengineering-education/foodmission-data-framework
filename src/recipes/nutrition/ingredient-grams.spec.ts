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

describe('quantityToGrams', () => {
  it.each([
    [500, 'G', 'Beef', 500],
    [1.5, 'KG', 'Beef', 1500],
    [1, 'L', 'Milk', 1000],
    [1, 'CUPS', 'Milk', 240],
  ] as const)('weighs %d %s of %s as %d g', (quantity, unit, name, grams) => {
    expect(quantityToGrams({ quantity, unit }, [name])).toBe(grams);
  });

  it.each([
    ['Milk', 240, 240],
    ['Coconut Milk', 240, 240],
    ['Flour', 240, 120],
    ['Olive oil', 30, 27.3],
    ['Almonds', 240, 141.6],
    ['Chocolate Chips', 240, 170.4],
    ['Miniature Marshmallows', 240, 43.2],
    ['Shredded Monterey Jack Cheese', 240, 112.8],
    ['Cream Cheese', 240, 228],
    ['Desiccated Coconut', 240, 84],
    ['Mushrooms', 240, 79.2],
    ['Peanut Butter', 240, 268.8],
  ])('weighs %s by its density (%d ml → %d g)', (name, ml, grams) => {
    expect(quantityToGrams({ quantity: ml, unit: 'ML' }, [name])).toBeCloseTo(
      grams,
      1,
    );
  });

  it.each([
    ['2', 'Eggs', 100],
    ['6', 'Egg Yolks', 102],
    ['2', 'Egg White', 66],
    ['2 large', 'Onion', 390],
    ['2', 'Lemongrass Stalks', 30],
    ['1 can', 'Tomatoes', 400],
    ['3 cans', 'Tomato Puree', 1200],
    ['4 sprigs', 'Thyme', 8],
  ])('weighs "%s" %s as %d g', (measure, name, grams) => {
    const quantity = parseInt(measure, 10);
    expect(quantityToGrams({ quantity, unit: 'PIECES' }, [name], measure)).toBe(
      grams,
    );
  });

  it.each([
    ['Dragon fruit', 'it has no known piece weight'],
    ['Black pepper', 'it is a spice, not the vegetable'],
  ])('does not weigh pieces of %s: %s', (name) => {
    expect(
      quantityToGrams({ quantity: 1, unit: 'PIECES' }, [name], '1'),
    ).toBeNull();
  });

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
});
