import {
  parseMeasure,
  parseFraction,
  getAverageWeight,
  parseQuantityUnit,
  lookupVolumeIngredient,
  quantityToGrams,
  MAX_MEASURE_LENGTH,
} from './measure-parser';

describe('parseMeasure', () => {
  describe('metric weight (high confidence)', () => {
    it('parses grams', () => {
      const result = parseMeasure('500g');
      expect(result).toEqual({
        grams: 500,
        original: '500g',
        confidence: 'high',
        method: 'weight',
      });
    });

    it('parses grams with space', () => {
      const result = parseMeasure('100 g');
      expect(result).toEqual({
        grams: 100,
        original: '100 g',
        confidence: 'high',
        method: 'weight',
      });
    });

    it('parses kilograms', () => {
      const result = parseMeasure('2kg');
      expect(result).toEqual({
        grams: 2000,
        original: '2kg',
        confidence: 'high',
        method: 'weight',
      });
    });

    it('parses decimal kilograms', () => {
      const result = parseMeasure('1.5kg');
      expect(result).toEqual({
        grams: 1500,
        original: '1.5kg',
        confidence: 'high',
        method: 'weight',
      });
    });

    it('parses grams with leading text', () => {
      const result = parseMeasure('Beef 500g');
      expect(result).toEqual({
        grams: 500,
        original: 'Beef 500g',
        confidence: 'high',
        method: 'weight',
      });
    });
  });

  describe('imperial weight (high confidence)', () => {
    it('parses pounds', () => {
      const result = parseMeasure('1 lb');
      expect(result.grams).toBeCloseTo(453.6, 0);
      expect(result.confidence).toBe('high');
      expect(result.method).toBe('weight');
    });

    it('parses half pound', () => {
      const result = parseMeasure('1/2 lb');
      expect(result.grams).toBeCloseTo(226.8, 0);
      expect(result.confidence).toBe('high');
    });

    it('parses ounces', () => {
      const result = parseMeasure('8 ounces');
      expect(result.grams).toBeCloseTo(226.8, 0);
      expect(result.confidence).toBe('high');
    });

    it('parses oz abbreviation', () => {
      const result = parseMeasure('3 oz');
      expect(result.grams).toBeCloseTo(85, 0);
      expect(result.confidence).toBe('high');
    });
  });

  describe('volume ml (medium confidence)', () => {
    it('parses milliliters', () => {
      const result = parseMeasure('200ml');
      expect(result).toEqual({
        grams: 200,
        original: '200ml',
        confidence: 'medium',
        method: 'volume',
      });
    });

    it('parses ml with space', () => {
      const result = parseMeasure('750 ml');
      expect(result).toEqual({
        grams: 750,
        original: '750 ml',
        confidence: 'medium',
        method: 'volume',
      });
    });

    it('parses liters', () => {
      const result = parseMeasure('1 L');
      expect(result.grams).toBe(1000);
      expect(result.confidence).toBe('medium');
    });
  });

  describe('volume cups/spoons (medium confidence)', () => {
    it('parses cups', () => {
      const result = parseMeasure('1 cup');
      expect(result.grams).toBe(150);
      expect(result.confidence).toBe('medium');
      expect(result.method).toBe('volume');
    });

    it('parses half cup', () => {
      const result = parseMeasure('1/2 cup');
      expect(result.grams).toBe(75);
      expect(result.confidence).toBe('medium');
    });

    it('parses mixed number cups', () => {
      const result = parseMeasure('2 1/2 cups');
      expect(result.grams).toBe(375);
      expect(result.confidence).toBe('medium');
    });

    it('parses tablespoons', () => {
      const result = parseMeasure('2 tablespoons');
      expect(result.grams).toBe(30);
      expect(result.confidence).toBe('medium');
    });

    it('parses tbsp abbreviation', () => {
      const result = parseMeasure('1 tbsp');
      expect(result.grams).toBe(15);
    });

    it('parses tbs abbreviation', () => {
      const result = parseMeasure('2 tbs');
      expect(result.grams).toBe(30);
    });

    it('parses tblsp abbreviation', () => {
      const result = parseMeasure('1 tblsp');
      expect(result.grams).toBe(15);
    });

    it('parses teaspoons', () => {
      const result = parseMeasure('1 tsp');
      expect(result.grams).toBe(5);
      expect(result.confidence).toBe('medium');
    });

    it('parses fraction teaspoons', () => {
      const result = parseMeasure('1/2 tsp');
      expect(result.grams).toBe(2.5);
    });

    it('uses ingredient density for dry spoon measures', () => {
      expect(parseMeasure('2 tbsp', 'Plain Flour').grams).toBeCloseTo(15.9);
      expect(parseMeasure('1 tsp', 'Salt').grams).toBe(6);
    });

    it('keeps 1 g/ml for liquids and unknown ingredients', () => {
      expect(parseMeasure('2 tbsp', 'Olive Oil').grams).toBe(30);
      expect(parseMeasure('1 tsp', 'Mystery').grams).toBe(5);
    });
  });

  describe('count with unit (medium confidence)', () => {
    it('parses cloves', () => {
      const result = parseMeasure('4 Cloves', 'Garlic');
      expect(result.grams).toBe(12);
      expect(result.confidence).toBe('medium');
      expect(result.method).toBe('count');
    });

    it('parses slices', () => {
      const result = parseMeasure('2 slices', 'Bread');
      expect(result.grams).toBe(60);
      expect(result.confidence).toBe('medium');
    });

    it('parses can', () => {
      const result = parseMeasure('1 Can', 'Black Beans');
      expect(result.grams).toBe(400);
      expect(result.confidence).toBe('medium');
    });

    it('parses rashers', () => {
      const result = parseMeasure('4 rashers', 'Bacon');
      expect(result.grams).toBe(100);
      expect(result.confidence).toBe('medium');
    });

    it('parses bay leaves', () => {
      const result = parseMeasure('2 leaves', 'Bay');
      expect(result.grams).toBe(1);
      expect(result.confidence).toBe('medium');
    });
  });

  describe('bare count (low confidence)', () => {
    it('parses bare number with egg', () => {
      const result = parseMeasure('3', 'Egg');
      expect(result.grams).toBe(150);
      expect(result.confidence).toBe('low');
      expect(result.method).toBe('count');
    });

    it('parses bare number with onion', () => {
      const result = parseMeasure('1', 'Onion');
      expect(result.grams).toBe(150);
      expect(result.confidence).toBe('low');
    });

    it('parses count with descriptor', () => {
      const result = parseMeasure('1 chopped', 'Tomato');
      expect(result.grams).toBe(120);
      expect(result.confidence).toBe('low');
    });

    it('uses default weight for unknown food', () => {
      const result = parseMeasure('2', 'Unknown Ingredient');
      expect(result.grams).toBe(200);
      expect(result.confidence).toBe('low');
    });

    it('returns default when no food name provided', () => {
      const result = parseMeasure('3');
      expect(result.grams).toBe(100);
      expect(result.confidence).toBe('low');
      expect(result.method).toBe('default');
    });
  });

  describe('count with size modifier (low confidence)', () => {
    it('parses large carrots', () => {
      const result = parseMeasure('3 Large', 'Carrots');
      expect(result.grams).toBe(80 * 3 * 1.3); // 312
      expect(result.confidence).toBe('low');
      expect(result.method).toBe('count');
    });

    it('parses small onion', () => {
      const result = parseMeasure('1 small', 'Onion');
      expect(result.grams).toBe(150 * 0.7); // 105
      expect(result.confidence).toBe('low');
    });

    it('parses medium potatoes', () => {
      const result = parseMeasure('2 medium', 'Potatoes');
      expect(result.grams).toBe(150 * 2 * 1); // 300
      expect(result.confidence).toBe('low');
    });
  });

  describe('qualitative measures (unknown confidence)', () => {
    it('returns 0 for "to taste"', () => {
      const result = parseMeasure('To taste');
      expect(result).toEqual({
        grams: 0,
        original: 'To taste',
        confidence: 'unknown',
        method: 'default',
      });
    });

    it('returns 0 for "pinch"', () => {
      const result = parseMeasure('Pinch');
      expect(result.grams).toBe(0);
      expect(result.confidence).toBe('unknown');
    });

    it('returns 0 for "dash"', () => {
      const result = parseMeasure('Dash');
      expect(result.grams).toBe(0);
      expect(result.confidence).toBe('unknown');
    });

    it('returns 0 for "splash"', () => {
      const result = parseMeasure('Splash');
      expect(result.grams).toBe(0);
      expect(result.confidence).toBe('unknown');
    });

    it('returns 0 for "drizzle"', () => {
      const result = parseMeasure('Drizzle');
      expect(result.grams).toBe(0);
      expect(result.confidence).toBe('unknown');
    });

    it('returns 0 for "bunch"', () => {
      const result = parseMeasure('Bunch');
      expect(result.grams).toBe(0);
      expect(result.confidence).toBe('unknown');
    });

    it('returns 0 for "sprigs of fresh"', () => {
      const result = parseMeasure('sprigs of fresh', 'Thyme');
      expect(result.grams).toBe(0);
      expect(result.confidence).toBe('unknown');
    });

    it('returns 0 for "handful"', () => {
      const result = parseMeasure('Handful');
      expect(result.grams).toBe(0);
      expect(result.confidence).toBe('unknown');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = parseMeasure('');
      expect(result.grams).toBe(100);
      expect(result.confidence).toBe('low');
    });

    it('handles whitespace only', () => {
      const result = parseMeasure('   ');
      expect(result.grams).toBe(100);
      expect(result.confidence).toBe('low');
    });

    it('handles mixed case', () => {
      const result = parseMeasure('2 CUPS');
      expect(result.grams).toBe(300);
    });

    it('handles beef stock with L suffix', () => {
      const result = parseMeasure('1 L', 'Beef Stock');
      expect(result.grams).toBe(1000);
      expect(result.confidence).toBe('medium');
    });

    it.each([
      ['½ cup', 75],
      ['1 ½ tsp', 7.5],
      ['1½ kg', 1500],
      ['1 1/2 L', 1500],
      ['1/2 kg chopped', 500],
      ['2.5 tbsp', 37.5],
      ['1-2tbsp', 22.5],
      ['6-8 slices', 210],
      ['2 400g cans', 400],
      ['8-ounce sliced', 226.8],
    ])('parses amount in %s', (measure, grams) => {
      expect(parseMeasure(measure).grams).toBeCloseTo(grams);
    });

    it('treats measures over the length limit as unknown', () => {
      const result = parseMeasure('1'.repeat(MAX_MEASURE_LENGTH + 1));
      expect(result).toMatchObject({ grams: 0, confidence: 'unknown' });
    });
  });
});

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
      parseMeasure(measure, 'Salt');
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

describe('getAverageWeight', () => {
  it('returns weight for exact match', () => {
    expect(getAverageWeight('egg')).toBe(50);
  });

  it('returns weight for case-insensitive match', () => {
    expect(getAverageWeight('EGG')).toBe(50);
  });

  it('returns weight for partial match', () => {
    expect(getAverageWeight('Large Onion')).toBe(150);
  });

  it('returns weight for compound ingredients', () => {
    expect(getAverageWeight('Chicken Breast')).toBe(200);
  });

  it('matches longer keys before shorter (e.g. eggplant not egg)', () => {
    expect(getAverageWeight('Large Eggplant')).toBe(300);
    expect(getAverageWeight('egg')).toBe(50);
  });

  it('returns default for unknown ingredients', () => {
    expect(getAverageWeight('Mysterious Ingredient')).toBe(100);
  });

  it('returns weight for red onion', () => {
    expect(getAverageWeight('Red Onion')).toBe(150);
  });

  it('returns weight for bay leaf', () => {
    expect(getAverageWeight('Bay Leaf')).toBe(0.5);
  });

  it('returns weight for garlic', () => {
    expect(getAverageWeight('garlic')).toBe(3);
  });
});

describe('parseQuantityUnit', () => {
  it.each([
    ['500g', 500, 'G'],
    ['1.5kg', 1.5, 'KG'],
    ['1,5 kg', 1.5, 'KG'],
    ['250 ml', 250, 'ML'],
    ['2 cl', 20, 'ML'],
    ['1 l', 1, 'L'],
    ['2 cups', 2, 'CUPS'],
    ['2-3 cups', 2.5, 'CUPS'],
    ['1 lb', 453.6, 'G'],
    ['8 oz', 226.8, 'G'],
    ['8 fl oz', 236.56, 'ML'],
    ['200g/7oz', 200, 'G'],
    ['2', 2, 'PIECES'],
    ['2 cloves minced', 2, 'PIECES'],
    ['1 large', 1, 'PIECES'],
    ['1 can', 1, 'PIECES'],
    ['1  bunch', 1, 'PIECES'],
    ['2 bunches', 2, 'PIECES'],
    ['2 PIECES', 2, 'PIECES'],
    ['500 G', 500, 'G'],
  ])('parses %s', (measure, quantity, unit) => {
    expect(parseQuantityUnit(measure)).toEqual({ quantity, unit });
  });

  it.each([
    ['2 tbsp', 2, 'TBSP'],
    ['1 tbs', 1, 'TBSP'],
    ['1 tblsp', 1, 'TBSP'],
    ['2 tablespoons', 2, 'TBSP'],
    ['1 ½ tbsp', 1.5, 'TBSP'],
    ['1 tsp', 1, 'TSP'],
    ['½ tsp', 0.5, 'TSP'],
    ['3 teaspoons', 3, 'TSP'],
    ['1 TBSP', 1, 'TBSP'],
  ])('keeps spoon measure %s as is', (measure, quantity, unit) => {
    expect(parseQuantityUnit(measure)).toEqual({ quantity, unit });
  });

  it.each([
    'to taste',
    'bunch',
    'small bunch',
    '1/2 handful',
    '1 dash',
    '1 pinch',
    'handful',
    'chopped',
    'juice of 1',
    'zest and juice of 1',
    '3cm piece',
    '0',
  ])('returns null for %s', (measure) => {
    expect(parseQuantityUnit(measure)).toBeNull();
  });
});

describe('lookupVolumeIngredient', () => {
  it('uses the head noun of compound names', () => {
    expect(lookupVolumeIngredient('Rice Vinegar')).toEqual({
      liquid: true,
      gramsPerMl: 1,
    });
    expect(lookupVolumeIngredient('Cream Cheese')?.liquid).toBe(false);
    expect(lookupVolumeIngredient('Cheese Sauce')?.liquid).toBe(true);
  });

  it('prefers the longer key on the same head', () => {
    expect(lookupVolumeIngredient('Kosher Salt')?.gramsPerMl).toBe(0.6);
  });

  it('does not match inside other words', () => {
    expect(lookupVolumeIngredient('Buttermilk')?.liquid).toBe(true);
    expect(lookupVolumeIngredient('Boiled Egg')).toBeNull();
  });
});

describe('quantityToGrams', () => {
  it.each([
    [{ quantity: 200, unit: 'G' as const }, 'Pasta', 200, 'high'],
    [{ quantity: 1.5, unit: 'KG' as const }, 'Beef', 1500, 'high'],
    [{ quantity: 30, unit: 'ML' as const }, 'Olive Oil', 30, 'medium'],
    [{ quantity: 1, unit: 'L' as const }, 'Milk', 1000, 'medium'],
    [{ quantity: 2, unit: 'CUPS' as const }, 'Rice', 300, 'medium'],
    [{ quantity: 2, unit: 'PIECES' as const }, 'Eggs', 100, 'low'],
    [{ quantity: 2, unit: 'TBSP' as const }, 'Olive Oil', 30, 'medium'],
    [{ quantity: 2, unit: 'TBSP' as const }, 'Plain Flour', 15.9, 'medium'],
    [{ quantity: 1, unit: 'TSP' as const }, 'Salt', 6, 'medium'],
  ])('converts %o of %s', (parsed, name, grams, confidence) => {
    const result = quantityToGrams(parsed, name);
    expect(result.grams).toBeCloseTo(grams);
    expect(result.confidence).toBe(confidence);
  });
});
