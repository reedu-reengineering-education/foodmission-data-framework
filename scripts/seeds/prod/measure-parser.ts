import { Unit } from '@prisma/client';
import { ML_PER_CUP } from '../../../src/recipes/nutrition/ingredient-grams';

const GRAMS_PER_LB = 453.6;
const GRAMS_PER_OZ = 28.35;

const UNITS: Record<string, [Unit, number]> = {
  g: [Unit.G, 1],
  gram: [Unit.G, 1],
  kg: [Unit.KG, 1],
  lb: [Unit.G, GRAMS_PER_LB],
  pound: [Unit.G, GRAMS_PER_LB],
  oz: [Unit.G, GRAMS_PER_OZ],
  ounce: [Unit.G, GRAMS_PER_OZ],
  ml: [Unit.ML, 1],
  l: [Unit.L, 1],
  litre: [Unit.L, 1],
  cup: [Unit.ML, ML_PER_CUP],
  tablespoon: [Unit.ML, 15],
  tbsp: [Unit.ML, 15],
  tbs: [Unit.ML, 15],
  tbls: [Unit.ML, 15],
  tblsp: [Unit.ML, 15],
  teaspoon: [Unit.ML, 5],
  tsp: [Unit.ML, 5],
};

const NOT_AN_AMOUNT = new Set(['cm', 'inch', 'x', 'qt', 'quart', 'pint']);

const QUALITATIVE_MEASURE =
  /to taste|pinch|dash|splash|drizzle|bunch|garnish|handful|sprigs? of fresh/;

const LEADING_AMOUNT =
  /^(\d+(?:[.,]\d+)?(?:[\s-]+\d+\/\d+|\/\d+|\s*-\s*\d+(?:[.,]\d+)?)?)\s*([a-z]+)?/;

const FRACTIONS: Record<string, string> = {
  '½': '1/2',
  '¼': '1/4',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅛': '1/8',
};

const singular = (word: string) => word.replace(/s$/, '');

function amountOf(text: string): number {
  const parts = text.replace(',', '.').split(/[\s-]+/);
  const valueOf = (part: string) => {
    const [numerator, denominator] = part.split('/').map(Number);
    return denominator ? numerator / denominator : numerator;
  };
  const isRange =
    parts.length === 2 && text.includes('-') && !parts[1].includes('/');
  return isRange
    ? (valueOf(parts[0]) + valueOf(parts[1])) / 2
    : parts.reduce((total, part) => total + valueOf(part), 0);
}

export function parseQuantityUnit(
  measure: string,
): { quantity: number; unit: Unit } | null {
  const text = measure
    .toLowerCase()
    .replace(/[½¼¾⅓⅔⅛]/g, (fraction) => ` ${FRACTIONS[fraction]}`)
    .trim();
  if (QUALITATIVE_MEASURE.test(text)) return null;

  const match = text.match(LEADING_AMOUNT);
  if (!match) return null;
  const [, amountText, word = ''] = match;
  const amount = amountOf(amountText);
  if (!(amount > 0)) return null;
  if (NOT_AN_AMOUNT.has(word) || NOT_AN_AMOUNT.has(singular(word))) {
    return null;
  }

  const [unit, factor] = UNITS[word] ??
    UNITS[singular(word)] ?? [Unit.PIECES, 1];
  return { quantity: Math.round(amount * factor * 100) / 100, unit };
}
