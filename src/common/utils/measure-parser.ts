import { Unit } from '@prisma/client';

export interface ParsedQuantity {
  quantity: number;
  unit: Unit;
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

const DEFAULT_SOLID_GRAMS_PER_ML = 0.6;

const GRAMS_PER_ML: Record<string, number> = {
  flour: 0.5,
  'almond flour': 0.4,
  'ground almonds?': 0.4,
  sugar: 0.83,
  'brown sugar': 0.89,
  'icing sugar': 0.47,
  'powdered sugar': 0.47,
  cocoa: 0.35,
  cacao: 0.35,
  cornstarch: 0.47,
  cornflour: 0.47,
  'baking powder': 0.9,
  salt: 1.2,
  breadcrumbs: 0.47,
  'graham cracker': 0.42,
  rice: 0.83,
  oats: 0.4,
  quinoa: 0.74,
  'lentils?': 0.8,
  'split peas': 0.82,
  butter: 0.94,
  'peanut butter': 1.12,
  oil: 0.91,
  shortening: 0.77,
  lard: 0.94,
  ghee: 0.73,
  tahini: 1.07,
  honey: 1.4,
  syrup: 1.3,
  jam: 1.42,
  molasses: 1.42,
  treacle: 1.42,
  'almonds?': 0.59,
  'peanuts?': 0.59,
  'pine nuts?': 0.59,
  'hazelnuts?': 0.59,
  'cashews?': 0.47,
  'walnuts?': 0.47,
  'pecans?': 0.47,
  'pistachios?': 0.5,
  'sesame seeds?': 0.59,
  'chocolate chips': 0.71,
  'marshmallows?': 0.18,
  'raisins?': 0.62,
  'dates?': 0.62,
  'dried cranberries': 0.48,
  'dried cherries': 0.59,
  coconut: 0.35,
  'coconut milk': 1,
  'coconut cream': 1,
  cheese: 0.47,
  mozzarella: 0.47,
  parmesan: 0.42,
  feta: 0.48,
  'cream cheese': 0.95,
  'cottage cheese': 0.94,
  ricotta: 0.95,
  'mushrooms?': 0.33,
  'spring onions?': 0.27,
  'scallions?': 0.27,
  'chives?': 0.18,
  'parsley|cilantro|basil|mint|dill': 0.25,
  spinach: 0.13,
  cabbage: 0.3,
  tomatoes: 0.75,
};

const LIQUID_NAME =
  /\b(water|milk|buttermilk|cream|fraiche|yogh?urt|stock|broth|juice|vinegar|sauce|wine|beer|cider|brandy|rum|sherry|liqueur|vodka|whisky|extract|puree|passata|paste|ketchup|mayonnaise|mustard|stout|hotsauce)\b/;

const AVERAGE_PIECE_GRAMS: Record<string, number> = {
  egg: 50,
  eggs: 50,
  'egg yolk': 17,
  lemongrass: 15,
  'egg white': 33,
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
  /\b(black|white|cayenne|ground|cracked)\s+peppers?\b|\bpeppercorns?\b|\bpepper (black|white|red cayenne)\b/;

const hasWord = (text: string, word: string) =>
  new RegExp(`\\b${word}\\b`).test(text);

function knownGramsPerMl(foodName: string): number | null {
  const name = foodName.toLowerCase();
  const [key] = Object.keys(GRAMS_PER_ML)
    .filter((candidate) => hasWord(name, candidate))
    .sort((a, b) => b.length - a.length);
  if (key) return GRAMS_PER_ML[key];
  return LIQUID_NAME.test(name) ? 1 : null;
}

function gramsPerMl(foodNames: string[]): number {
  for (const name of foodNames) {
    const known = knownGramsPerMl(name);
    if (known != null) return known;
  }
  return DEFAULT_SOLID_GRAMS_PER_ML;
}

function averagePieceGrams(foodNames: string[]): number | null {
  const names = foodNames.map((name) => name.toLowerCase());
  if (names.some((name) => SPICE_PEPPER.test(name))) return null;
  for (const name of names) {
    const key = AVERAGE_PIECE_KEYS.find((candidate) =>
      name.includes(candidate),
    );
    if (key) return AVERAGE_PIECE_GRAMS[key];
  }
  return null;
}

function pieceGrams(
  quantity: number,
  foodNames: string[],
  measure: string,
): number | null {
  const countWord = COUNT_WORDS.find((word) => hasWord(measure, word));
  if (countWord) return quantity * COUNT_GRAMS[countWord];

  const average = averagePieceGrams(foodNames);
  if (average == null) return null;
  const size = measure.match(/\b(small|medium|large)\b/);
  return quantity * average * (size ? SIZE_MODIFIERS[size[1]] : 1);
}

export function quantityToGrams(
  { quantity, unit }: ParsedQuantity,
  foodNames: string[],
  measure?: string | null,
): number | null {
  switch (unit) {
    case Unit.G:
      return quantity;
    case Unit.KG:
      return quantity * 1000;
    case Unit.ML:
      return quantity * gramsPerMl(foodNames);
    case Unit.L:
      return quantity * 1000 * gramsPerMl(foodNames);
    case Unit.CUPS:
      return quantity * ML_PER_CUP * gramsPerMl(foodNames);
    case Unit.PIECES:
      return pieceGrams(quantity, foodNames, (measure ?? '').toLowerCase());
    default:
      return null;
  }
}
