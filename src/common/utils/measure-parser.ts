import { Unit } from '@prisma/client';

export interface ParsedMeasure {
  grams: number;
  original: string;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  method: 'weight' | 'volume' | 'count' | 'default';
}

export interface ParsedQuantity {
  quantity: number;
  unit: Unit;
}

export const MAX_MEASURE_LENGTH = 100;

const GRAMS_PER_LB = 453.6;
const GRAMS_PER_OZ = 28.35;
const ML_PER_CUP = 240;
const GRAMS_PER_CUP = 150;

const AMOUNT = String.raw`(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+|\/\d+|\s*-\s*\d+(?:[.,]\d+)?)?)`;

const QUALITATIVE_MEASURE =
  /to taste|pinch|dash|splash|drizzle|bunch|garnish|handful|sprigs? of fresh/i;

const SPOON_ML: Record<string, number> = {
  tablespoon: 15,
  tablespoons: 15,
  tbsp: 15,
  tbs: 15,
  tbls: 15,
  tblsp: 15,
  teaspoon: 5,
  teaspoons: 5,
  tsp: 5,
};

const METRIC_UNIT_TOKENS: Record<string, [Unit, number]> = {
  g: [Unit.G, 1],
  grams: [Unit.G, 1],
  kg: [Unit.KG, 1],
  ml: [Unit.ML, 1],
  l: [Unit.L, 1],
  litre: [Unit.L, 1],
  litres: [Unit.L, 1],
  cup: [Unit.ML, ML_PER_CUP],
  cups: [Unit.ML, ML_PER_CUP],
  lb: [Unit.G, GRAMS_PER_LB],
  lbs: [Unit.G, GRAMS_PER_LB],
  pound: [Unit.G, GRAMS_PER_LB],
  pounds: [Unit.G, GRAMS_PER_LB],
  oz: [Unit.G, GRAMS_PER_OZ],
  ounce: [Unit.G, GRAMS_PER_OZ],
  ounces: [Unit.G, GRAMS_PER_OZ],
  ...Object.fromEntries(
    Object.entries(SPOON_ML).map(([token, ml]) => [token, [Unit.ML, ml]]),
  ),
};

const COUNT_GRAMS: Record<string, number> = {
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

const SIZE_MODIFIERS: Record<string, number> = {
  small: 0.7,
  medium: 1,
  large: 1.3,
};

const amountWith = (units: string) => new RegExp(`${AMOUNT}\\s*(${units})\\b`);

const anyOf = (tokens: string[]) =>
  [...tokens].sort((a, b) => b.length - a.length).join('|');

const WEIGHT_PATTERN = amountWith('kg|g');
const LB_PATTERN = new RegExp(`${AMOUNT}(?:-|\\s*)(?:lb|lbs|pound|pounds)\\b`);
const OZ_PATTERN = new RegExp(`${AMOUNT}(?:-|\\s*)(?:oz|ounces?)\\b`);
const VOLUME_PATTERN = amountWith('ml|l');
const CUP_PATTERN = amountWith('cups?');
const SPOON_PATTERN = amountWith(anyOf(Object.keys(SPOON_ML)));
const COUNT_PATTERN = amountWith(anyOf(Object.keys(COUNT_GRAMS)));
const SIZE_PATTERN = amountWith(anyOf(Object.keys(SIZE_MODIFIERS)));
const BARE_COUNT_PATTERN = new RegExp(`^${AMOUNT}(?:\\s+\\w+)?$`);

const LENGTH_TOKENS = new Set(['cm', 'inch']);

const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2',
  '¼': '1/4',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅛': '1/8',
};

const LEADING_QUANTITY = new RegExp(`^${AMOUNT}\\s*([a-z]+)?`);

export function parseMeasure(
  measure: string,
  foodName?: string,
): ParsedMeasure {
  const original = measure;
  const normalized = normalizeUnicodeFractions(measure.toLowerCase().trim());

  if (
    normalized.length > MAX_MEASURE_LENGTH ||
    QUALITATIVE_MEASURE.test(normalized)
  ) {
    return { grams: 0, original, confidence: 'unknown', method: 'default' };
  }

  const weightMatch = normalized.match(WEIGHT_PATTERN);
  if (weightMatch) {
    const value = parseAmount(weightMatch[1]);
    const grams = weightMatch[2] === 'kg' ? value * 1000 : value;
    return { grams, original, confidence: 'high', method: 'weight' };
  }

  const lbMatch = normalized.match(LB_PATTERN);
  if (lbMatch) {
    const grams = parseAmount(lbMatch[1]) * GRAMS_PER_LB;
    return { grams, original, confidence: 'high', method: 'weight' };
  }

  const ozMatch = normalized.match(OZ_PATTERN);
  if (ozMatch) {
    const grams = parseAmount(ozMatch[1]) * GRAMS_PER_OZ;
    return { grams, original, confidence: 'high', method: 'weight' };
  }

  const volumeMatch = normalized.match(VOLUME_PATTERN);
  if (volumeMatch) {
    const grams =
      parseAmount(volumeMatch[1]) * (volumeMatch[2] === 'l' ? 1000 : 1);
    return { grams, original, confidence: 'medium', method: 'volume' };
  }

  const cupMatch = normalized.match(CUP_PATTERN);
  if (cupMatch) {
    const grams = parseAmount(cupMatch[1]) * GRAMS_PER_CUP;
    return { grams, original, confidence: 'medium', method: 'volume' };
  }

  const spoonMatch = normalized.match(SPOON_PATTERN);
  if (spoonMatch) {
    const grams = parseAmount(spoonMatch[1]) * SPOON_ML[spoonMatch[2]];
    return { grams, original, confidence: 'medium', method: 'volume' };
  }

  const countMatch = normalized.match(COUNT_PATTERN);
  if (countMatch) {
    const grams = parseAmount(countMatch[1]) * COUNT_GRAMS[countMatch[2]];
    return { grams, original, confidence: 'medium', method: 'count' };
  }

  const sizeMatch = normalized.match(SIZE_PATTERN);
  if (sizeMatch && foodName) {
    const grams =
      parseAmount(sizeMatch[1]) *
      getAverageWeight(foodName) *
      SIZE_MODIFIERS[sizeMatch[2]];
    return { grams, original, confidence: 'low', method: 'count' };
  }

  const bareCountMatch = normalized.match(BARE_COUNT_PATTERN);
  if (bareCountMatch && foodName) {
    const count = parseAmount(bareCountMatch[1]);
    if (count > 0) {
      return {
        grams: count * getAverageWeight(foodName),
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

export function parseQuantityUnit(measure: string): ParsedQuantity | null {
  if (measure.length > MAX_MEASURE_LENGTH) return null;
  const normalized = normalizeUnicodeFractions(measure.toLowerCase().trim());
  if (QUALITATIVE_MEASURE.test(normalized)) return null;

  const match = normalized.match(LEADING_QUANTITY);
  if (!match) return null;

  const [, amountText, token] = match;
  const amount = parseAmount(amountText);
  if (amount <= 0) return null;

  if (!token) return { quantity: round2(amount), unit: Unit.PIECES };

  const metricUnit = METRIC_UNIT_TOKENS[token];
  if (metricUnit) {
    const [unit, factor] = metricUnit;
    return { quantity: round2(amount * factor), unit };
  }

  if (LENGTH_TOKENS.has(token)) return null;

  return { quantity: round2(amount), unit: Unit.PIECES };
}

function normalizeUnicodeFractions(text: string): string {
  return text.replace(
    /(?:(\d)\s*)?([½¼¾⅓⅔⅛])/g,
    (_, whole: string | undefined, frac) =>
      whole
        ? `${whole} ${UNICODE_FRACTIONS[frac as string]}`
        : UNICODE_FRACTIONS[frac as string],
  );
}

function parseAmount(text: string): number {
  return parseFraction(text.replace(',', '.'));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const GRAMS_PER_ML: Record<string, number> = {
  'icing sugar': 0.56,
  'powdered sugar': 0.56,
  'brown sugar': 0.9,
  'cocoa powder': 0.41,
  'baking powder': 0.9,
  'peanut butter': 1.07,
  cornstarch: 0.54,
  cornflour: 0.54,
  breadcrumbs: 0.45,
  flour: 0.53,
  sugar: 0.85,
  salt: 1.2,
  butter: 0.96,
  oil: 0.91,
  honey: 1.42,
  syrup: 1.37,
  cocoa: 0.41,
  rice: 0.85,
  oats: 0.35,
  yogurt: 1.03,
  yoghurt: 1.03,
};

const LIQUID_NAMES = [
  'water',
  'milk',
  'cream',
  'stock',
  'broth',
  'juice',
  'vinegar',
  'sauce',
  'wine',
  'beer',
  'extract',
];

/**
 * Grams per millilitre for a food name. Unknown foods use water density (1).
 * Longer names win, so "peanut butter" is not treated as butter.
 */
export function lookupGramsPerMl(foodName: string): number {
  const name = foodName.toLowerCase();
  let best: { key: string; grams: number } | null = null;
  for (const [key, grams] of Object.entries(GRAMS_PER_ML)) {
    if (!new RegExp(`\\b${key}\\b`).test(name)) continue;
    if (!best || key.length > best.key.length) best = { key, grams };
  }
  if (best) return best.grams;
  if (LIQUID_NAMES.some((key) => new RegExp(`\\b${key}\\b`).test(name))) {
    return 1;
  }
  return 1;
}

/**
 * Convert a parsed quantity into grams.
 * Returns null for a piece count that has no count-word weight and no
 * average weight. Callers must not substitute 100 g.
 */
export function quantityToGrams(
  parsed: ParsedQuantity,
  foodName: string,
  measure?: string | null,
): ParsedMeasure | null {
  const original = measure?.trim() || `${parsed.quantity} ${parsed.unit}`;
  switch (parsed.unit) {
    case Unit.G:
      return {
        grams: parsed.quantity,
        original,
        confidence: 'high',
        method: 'weight',
      };
    case Unit.KG:
      return {
        grams: parsed.quantity * 1000,
        original,
        confidence: 'high',
        method: 'weight',
      };
    case Unit.ML:
      return {
        grams: parsed.quantity * lookupGramsPerMl(foodName),
        original,
        confidence: 'medium',
        method: 'volume',
      };
    case Unit.L:
      return {
        grams: parsed.quantity * 1000 * lookupGramsPerMl(foodName),
        original,
        confidence: 'medium',
        method: 'volume',
      };
    case Unit.CUPS:
      return {
        grams: parsed.quantity * ML_PER_CUP * lookupGramsPerMl(foodName),
        original,
        confidence: 'medium',
        method: 'volume',
      };
    case Unit.PIECES:
      return pieceGrams(parsed.quantity, foodName, measure, original);
    default:
      return null;
  }
}

function pieceGrams(
  quantity: number,
  foodName: string,
  measure: string | null | undefined,
  original: string,
): ParsedMeasure | null {
  const perCountWord = countWordGrams(measure);
  if (perCountWord != null) {
    return {
      grams: quantity * perCountWord,
      original,
      confidence: 'medium',
      method: 'count',
    };
  }

  const weight = lookupAverageWeight(foodName);
  if (weight == null) return null;

  const size = measure?.toLowerCase().match(/\b(small|medium|large)\b/);
  const modifier = size ? SIZE_MODIFIERS[size[1]] : 1;
  return {
    grams: quantity * weight * modifier,
    original,
    confidence: 'low',
    method: 'count',
  };
}

function countWordGrams(measure: string | null | undefined): number | null {
  if (!measure) return null;
  const normalized = measure.toLowerCase();
  const tokens = Object.keys(COUNT_GRAMS).sort((a, b) => b.length - a.length);
  for (const token of tokens) {
    if (new RegExp(`\\b${token}\\b`).test(normalized))
      return COUNT_GRAMS[token];
  }
  return null;
}

const SPICE_PEPPER =
  /\b(black|white|cayenne|ground|cracked)\s+peppers?\b|\bpeppercorns?\b/;

/**
 * Average weight of one piece, or null when this food is not in the table.
 * Spice peppers are not the vegetable "pepper" row (150 g).
 */
export function lookupAverageWeight(foodName: string): number | null {
  if (SPICE_PEPPER.test(foodName.toLowerCase())) return null;
  return matchAverageWeight(foodName);
}

export function getAverageWeight(foodName: string): number {
  return matchAverageWeight(foodName) ?? 100;
}

function matchAverageWeight(foodName: string): number | null {
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

  return null;
}
