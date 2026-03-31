export interface ParsedMeasure {
  grams: number;
  original: string;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  method: 'weight' | 'volume' | 'count' | 'default';
}

export function parseMeasure(
  measure: string,
  foodName?: string,
): ParsedMeasure {
  const original = measure;
  const normalized = measure.toLowerCase().trim();

  if (
    /to taste|pinch|dash|splash|drizzle|bunch|garnish|handful|sprigs? of fresh/i.test(
      normalized,
    )
  ) {
    return { grams: 0, original, confidence: 'unknown', method: 'default' };
  }

  const metricMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/);
  if (metricMatch) {
    const value = parseFloat(metricMatch[1].replace(',', '.'));
    const grams = metricMatch[2] === 'kg' ? value * 1000 : value;
    return { grams, original, confidence: 'high', method: 'weight' };
  }

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

  const mlMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*ml\b/);
  if (mlMatch) {
    const grams = parseFloat(mlMatch[1].replace(',', '.'));
    return { grams, original, confidence: 'medium', method: 'volume' };
  }

  const literMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*l\b/);
  if (literMatch) {
    const grams = parseFloat(literMatch[1].replace(',', '.')) * 1000;
    return { grams, original, confidence: 'medium', method: 'volume' };
  }

  const volumeUnits: Record<string, number> = {
    cup: 150,
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

  const countUnits: Record<string, number> = {
    clove: 3,
    cloves: 3,
    slice: 30,
    slices: 30,
    sprig: 2,
    can: 400,
    rasher: 25,
    rashers: 25,
    piece: 50,
    pieces: 50,
    strip: 20,
    strips: 20,
    leaf: 0.5,
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

  return { grams: 100, original, confidence: 'low', method: 'default' };
}

export function parseFraction(str: string): number {
  const trimmed = str.trim();

  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return (
      parseInt(mixedMatch[1]) +
      parseInt(mixedMatch[2]) / parseInt(mixedMatch[3])
    );
  }

  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
  }

  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    return (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2;
  }

  return parseFloat(trimmed) || 0;
}

export function getAverageWeight(foodName: string): number {
  const name = foodName.toLowerCase();

  const weights: Record<string, number> = {
    egg: 50,
    eggs: 50,

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

    garlic: 3,
    'garlic clove': 3,
    shallot: 30,
    shallots: 30,
    challot: 30,
    challots: 30,
    leek: 150,

    lemon: 60,
    lime: 45,
    apple: 180,
    banana: 120,
    orange: 180,

    'chicken breast': 200,
    'chicken thigh': 150,
    chorizo: 150,
    morcilla: 200,
    steak: 200,

    naan: 100,
    'naan bread': 100,
    tortilla: 50,

    'bay leaf': 0.5,
    'bay leaves': 0.5,
    cardamom: 0.5,
    'bouquet garni': 10,
    thyme: 2,
    rosemary: 2,
  };

  if (weights[name]) {
    return weights[name];
  }

  const entriesByKeyLength = Object.entries(weights).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [key, weight] of entriesByKeyLength) {
    if (name.includes(key)) {
      return weight;
    }
  }

  return 100;
}
