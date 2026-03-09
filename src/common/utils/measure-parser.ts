/**
 * Measure Parser Utility
 *
 * Parses ingredient measure strings from recipes (e.g., "500g", "2 cups", "1 lb")
 * into gram weights for nutrition calculation.
 */

export interface ParsedMeasure {
  /** Weight in grams */
  grams: number;
  /** Original measure string */
  original: string;
  /** Confidence level of the parsing */
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  /** Method used to parse */
  method: 'weight' | 'volume' | 'count' | 'default';
}

/**
 * Parse an ingredient measure string into grams.
 *
 * Priority order:
 * 1. Qualitative terms ("to taste", "pinch") → skip with unknown confidence
 * 2. Metric weight (g, kg) → direct conversion, high confidence
 * 3. Imperial weight (lb, oz) → convert to grams, high confidence
 * 4. Volume in ml → assume density ≈ 1, medium confidence
 * 5. Volume (cups, tbsp, tsp) → lookup table, medium confidence
 * 6. Count with unit (cloves, slices) → lookup table, medium confidence
 * 7. Bare count with food name → average weight lookup, low confidence
 * 8. Count with size modifier (1 large) → modified avg weight, low confidence
 * 9. Default → 100g fallback, low confidence
 */
export function parseMeasure(
  measure: string,
  foodName?: string,
): ParsedMeasure {
  const original = measure;
  const normalized = measure.toLowerCase().trim();

  // 1. QUALITATIVE → skip (unknown confidence)
  if (
    /to taste|pinch|dash|splash|drizzle|bunch|garnish|handful|sprigs? of fresh/i.test(
      normalized,
    )
  ) {
    return { grams: 0, original, confidence: 'unknown', method: 'default' };
  }

  // 2. METRIC WEIGHT (highest confidence)
  // Matches: "500g", "2kg", "100 g", "2 kg", "2.5kg"
  const metricMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/);
  if (metricMatch) {
    const value = parseFloat(metricMatch[1].replace(',', '.'));
    const grams = metricMatch[2] === 'kg' ? value * 1000 : value;
    return { grams, original, confidence: 'high', method: 'weight' };
  }

  // 3. IMPERIAL WEIGHT
  // Matches: "1 lb", "1/2 lb", "4-5 pound", "8 ounces", "3 oz"
  const lbMatch = normalized.match(/([\d\s/.-]+)\s*(?:lb|lbs|pound|pounds)\b/);
  if (lbMatch) {
    const grams = parseFraction(lbMatch[1]) * 453.6;
    return { grams, original, confidence: 'high', method: 'weight' };
  }
  const ozMatch = normalized.match(/([\d\s/.-]+)\s*(?:oz|ounces?)\b/);
  if (ozMatch) {
    const grams = parseFraction(ozMatch[1]) * 28.35;
    return { grams, original, confidence: 'high', method: 'weight' };
  }

  // 4. VOLUME (ml) — assume density ≈ 1 for liquids
  const mlMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*ml\b/);
  if (mlMatch) {
    const grams = parseFloat(mlMatch[1].replace(',', '.'));
    return { grams, original, confidence: 'medium', method: 'volume' };
  }

  // 5. VOLUME (liters)
  const literMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*l\b/);
  if (literMatch) {
    const grams = parseFloat(literMatch[1].replace(',', '.')) * 1000;
    return { grams, original, confidence: 'medium', method: 'volume' };
  }

  // 6. VOLUME (cups, tablespoons, teaspoons)
  const volumeUnits: Record<string, number> = {
    cup: 150, // avg for solid foods
    cups: 150,
    tablespoon: 15,
    tablespoons: 15,
    tbsp: 15,
    tbs: 15,
    tblsp: 15,
    teaspoon: 5,
    teaspoons: 5,
    tsp: 5,
  };
  for (const [unit, gramsPerUnit] of Object.entries(volumeUnits)) {
    const regex = new RegExp(`([\\d\\s/]+)\\s*${unit}\\b`, 'i');
    const match = normalized.match(regex);
    if (match) {
      const grams = parseFraction(match[1]) * gramsPerUnit;
      return { grams, original, confidence: 'medium', method: 'volume' };
    }
  }

  // 7. COUNT WITH UNIT (cloves, slices, etc.)
  const countUnits: Record<string, number> = {
    clove: 3, // garlic clove
    cloves: 3,
    slice: 30, // bread slice
    slices: 30,
    sprig: 2, // herb sprig
    can: 400, // standard can
    rasher: 25, // bacon rasher
    rashers: 25,
    piece: 50, // generic piece
    pieces: 50,
    strip: 20, // bacon strip
    strips: 20,
    leaf: 0.5, // bay leaf
    leaves: 0.5,
  };
  for (const [unit, gramsPerUnit] of Object.entries(countUnits)) {
    const regex = new RegExp(`([\\d\\s/]+)\\s*${unit}\\b`, 'i');
    const match = normalized.match(regex);
    if (match) {
      const grams = parseFraction(match[1]) * gramsPerUnit;
      return { grams, original, confidence: 'medium', method: 'count' };
    }
  }

  // 8. COUNT WITH MODIFIERS — "1 large", "2 medium", "3 small"
  const sizeModifiers: Record<string, number> = {
    small: 0.7,
    medium: 1,
    large: 1.3,
  };
  const modifierMatch = normalized.match(
    /([\d\s/]+)\s*(small|medium|large)\b/i,
  );
  if (modifierMatch && foodName) {
    const count = parseFraction(modifierMatch[1]);
    const modifier = sizeModifiers[modifierMatch[2].toLowerCase()] || 1;
    const avgWeight = getAverageWeight(foodName);
    return {
      grams: count * avgWeight * modifier,
      original,
      confidence: 'low',
      method: 'count',
    };
  }

  // 9. BARE COUNT — use food name to estimate weight
  // Matches: "3", "1", "2", also handles "1 chopped", "2 sliced"
  const bareCountMatch = normalized.match(/^([\d\s/]+)(?:\s+\w+)?$/);
  if (bareCountMatch && foodName) {
    const count = parseFraction(bareCountMatch[1]);
    if (count > 0) {
      const avgWeight = getAverageWeight(foodName);
      return {
        grams: count * avgWeight,
        original,
        confidence: 'low',
        method: 'count',
      };
    }
  }

  // 10. DEFAULT — unparseable, use 100g fallback
  return { grams: 100, original, confidence: 'low', method: 'default' };
}

/**
 * Parse fractions and mixed numbers.
 * Supports: "1/2", "2 1/2", "4-5" (range → midpoint), "1.5", "3"
 */
export function parseFraction(str: string): number {
  const trimmed = str.trim();

  // Mixed number: "2 1/2" → 2.5
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return (
      parseInt(mixedMatch[1]) +
      parseInt(mixedMatch[2]) / parseInt(mixedMatch[3])
    );
  }

  // Simple fraction: "1/2" → 0.5
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
  }

  // Range: "4-5" → 4.5, "4 - 5" → 4.5
  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    return (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2;
  }

  // Decimal or integer
  return parseFloat(trimmed) || 0;
}

/**
 * Lookup table for common ingredient average weights (in grams).
 * Used when only a count is specified (e.g., "3" eggs).
 */
export function getAverageWeight(foodName: string): number {
  const name = foodName.toLowerCase();

  // Lookup table with common ingredients
  const weights: Record<string, number> = {
    // Eggs & dairy
    egg: 50,
    eggs: 50,

    // Vegetables
    onion: 150,
    onions: 150,
    'red onion': 150,
    'red onions': 150,
    tomato: 120,
    tomatoes: 120,
    'plum tomato': 60,
    'plum tomatoes': 60,
    potato: 150,
    potatoes: 150,
    carrot: 80,
    carrots: 80,
    celery: 40,
    'green pepper': 150,
    'red pepper': 150,
    pepper: 150,
    cucumber: 300,
    zucchini: 200,
    courgette: 200,
    aubergine: 300,
    eggplant: 300,

    // Aromatics
    garlic: 3, // single clove if no "cloves" specified
    'garlic clove': 3,
    shallot: 30,
    shallots: 30,
    challot: 30,
    challots: 30,
    leek: 150,

    // Fruits
    lemon: 60,
    lime: 45,
    apple: 180,
    banana: 120,
    orange: 180,

    // Proteins
    'chicken breast': 200,
    'chicken thigh': 150,
    chorizo: 150,
    morcilla: 200,
    steak: 200,

    // Bread & grains
    naan: 100,
    'naan bread': 100,
    tortilla: 50,

    // Herbs & spices
    'bay leaf': 0.5,
    'bay leaves': 0.5,
    cardamom: 0.5,
    'bouquet garni': 10,
    thyme: 2,
    rosemary: 2,
  };

  // Exact match first
  if (weights[name]) {
    return weights[name];
  }

  // Fuzzy match: check if any key is contained in foodName
  for (const [key, weight] of Object.entries(weights)) {
    if (name.includes(key)) {
      return weight;
    }
  }

  return 100; // default for unknown items
}
