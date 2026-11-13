import { Unit } from '@prisma/client';

export interface ParsedQuantity {
  quantity: number;
  unit: Unit;
}

export interface WeighedAmount {
  grams: number;
  quality: number;
}

export const MAX_MEASURE_LENGTH = 100;

const GRAMS_PER_LB = 453.6;
const GRAMS_PER_OZ = 28.35;
const ML_PER_CUP = 240;

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

const COUNT_WORDS = Object.keys(COUNT_GRAMS).sort(
  (a, b) => b.length - a.length,
);

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

export function parseFraction(str: string): number {
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

const WEIGHT_QUALITY = 1;
const VOLUME_QUALITY = 0.7;
const COUNT_WORD_QUALITY = 0.7;
const AVERAGE_PIECE_QUALITY = 0.4;

const DEFAULT_SOLID_GRAMS_PER_ML = 0.6;

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
  jam: 1.3,
  molasses: 1.4,
  treacle: 1.4,
  cocoa: 0.41,
  rice: 0.85,
  oats: 0.35,
};

const LIQUID_NAME =
  /\b(water|milk|buttermilk|cream|fraiche|yogh?urt|stock|broth|juice|vinegar|sauce|wine|beer|cider|brandy|rum|sherry|liqueur|vodka|whisky|extract|puree|passata|paste|ketchup|mayonnaise|mustard|stout|hotsauce)\b/;

const AVERAGE_PIECE_GRAMS: Record<string, number> = {
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
  chilli: 15,
  chillies: 15,
  'scotch bonnet': 10,
  'spring onion': 15,
  scallion: 15,
  cabbage: 900,
  fennel: 230,
  sausage: 60,
  baguette: 250,
  pita: 60,
  'star anise': 1,
};

const AVERAGE_PIECE_KEYS = Object.keys(AVERAGE_PIECE_GRAMS).sort(
  (a, b) => b.length - a.length,
);

export const SPICE_PEPPER =
  /\b(black|white|cayenne|ground|cracked)\s+peppers?\b|\bpeppercorns?\b/;

const hasWord = (text: string, word: string) =>
  new RegExp(`\\b${word}\\b`).test(text);

function gramsPerMl(foodName: string): number {
  const name = foodName.toLowerCase();
  const [key] = Object.keys(GRAMS_PER_ML)
    .filter((candidate) => hasWord(name, candidate))
    .sort((a, b) => b.length - a.length);
  if (key) return GRAMS_PER_ML[key];
  return LIQUID_NAME.test(name) ? 1 : DEFAULT_SOLID_GRAMS_PER_ML;
}

function averagePieceGrams(foodName: string): number | null {
  const name = foodName.toLowerCase();
  if (SPICE_PEPPER.test(name)) return null;
  const key = AVERAGE_PIECE_KEYS.find((candidate) => name.includes(candidate));
  return key ? AVERAGE_PIECE_GRAMS[key] : null;
}

function pieceGrams(
  quantity: number,
  foodName: string,
  measure: string,
): WeighedAmount | null {
  const countWord = COUNT_WORDS.find((word) => hasWord(measure, word));
  if (countWord) {
    return {
      grams: quantity * COUNT_GRAMS[countWord],
      quality: COUNT_WORD_QUALITY,
    };
  }

  const average = averagePieceGrams(foodName);
  if (average == null) return null;
  const size = measure.match(/\b(small|medium|large)\b/);
  return {
    grams: quantity * average * (size ? SIZE_MODIFIERS[size[1]] : 1),
    quality: AVERAGE_PIECE_QUALITY,
  };
}

export function quantityToGrams(
  { quantity, unit }: ParsedQuantity,
  foodName: string,
  measure?: string | null,
): WeighedAmount | null {
  switch (unit) {
    case Unit.G:
      return { grams: quantity, quality: WEIGHT_QUALITY };
    case Unit.KG:
      return { grams: quantity * 1000, quality: WEIGHT_QUALITY };
    case Unit.ML:
      return {
        grams: quantity * gramsPerMl(foodName),
        quality: VOLUME_QUALITY,
      };
    case Unit.L:
      return {
        grams: quantity * 1000 * gramsPerMl(foodName),
        quality: VOLUME_QUALITY,
      };
    case Unit.CUPS:
      return {
        grams: quantity * ML_PER_CUP * gramsPerMl(foodName),
        quality: VOLUME_QUALITY,
      };
    case Unit.PIECES:
      return pieceGrams(quantity, foodName, (measure ?? '').toLowerCase());
    default:
      return null;
  }
}
