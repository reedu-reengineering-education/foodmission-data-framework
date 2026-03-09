import {
  parseMeasure,
  parseFraction,
  getAverageWeight,
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
