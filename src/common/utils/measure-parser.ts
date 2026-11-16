import { Unit } from '@prisma/client';

export interface ParsedQuantity {
  quantity: number;
  unit: Unit;
}

export const MAX_MEASURE_LENGTH = 100;

const GRAMS_PER_LB = 453.6;
const GRAMS_PER_OZ = 28.35;
export const ML_PER_CUP = 240;

const AMOUNT = String.raw`(\d+(?:[.,]\d+)?(?:[\s-]+\d+\/\d+|\/\d+|\s*-\s*\d+(?:[.,]\d+)?)?)`;

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

const NOT_A_COUNT_TOKENS = new Set([
  'cm',
  'inch',
  'x',
  'qt',
  'quart',
  'quarts',
  'pint',
  'pints',
]);

const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2',
  '¼': '1/4',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅛': '1/8',
};

const LEADING_QUANTITY = new RegExp(`^${AMOUNT}\\s*([a-z]+)?`);

function parseFraction(str: string): number {
  const trimmed = str.trim();

  const mixedMatch = trimmed.match(/^(\d+)[\s-]+(\d+)\/(\d+)$/);
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

  if (NOT_A_COUNT_TOKENS.has(token)) return null;

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
