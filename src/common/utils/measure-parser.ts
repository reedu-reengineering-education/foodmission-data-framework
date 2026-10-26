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

const QUALITATIVE_MEASURE =
  /to taste|pinch|dash|splash|drizzle|bunch|garnish|handful|sprigs? of fresh/i;

const SPOON_ML: Record<string, number> = {
  tablespoon: 15,
  tablespoons: 15,
  tbsp: 15,
  tbs: 15,
  tbl: 15,
  tbls: 15,
  tblsp: 15,
  teaspoon: 5,
  teaspoons: 5,
  tsp: 5,
};

const CATALOG_UNIT_TOKENS: Record<string, [Unit, number]> = {
  g: [Unit.G, 1],
  gr: [Unit.G, 1],
  gram: [Unit.G, 1],
  grams: [Unit.G, 1],
  kg: [Unit.KG, 1],
  kilo: [Unit.KG, 1],
  kilos: [Unit.KG, 1],
  kilogram: [Unit.KG, 1],
  kilograms: [Unit.KG, 1],
  ml: [Unit.ML, 1],
  cl: [Unit.ML, 10],
  dl: [Unit.ML, 100],
  l: [Unit.L, 1],
  litre: [Unit.L, 1],
  litres: [Unit.L, 1],
  liter: [Unit.L, 1],
  liters: [Unit.L, 1],
  cup: [Unit.CUPS, 1],
  cups: [Unit.CUPS, 1],
  lb: [Unit.G, 453.6],
  lbs: [Unit.G, 453.6],
  pound: [Unit.G, 453.6],
  pounds: [Unit.G, 453.6],
  oz: [Unit.G, 28.35],
  ounce: [Unit.G, 28.35],
  ounces: [Unit.G, 28.35],
  'fl oz': [Unit.ML, 29.57],
};

const LENGTH_TOKENS = new Set(['cm', 'mm', 'inch', 'inches']);

const COUNTABLE_QUALITATIVE_TOKENS = new Set(['bunch', 'bunches']);

const FRUIT_PART =
  /^(?:the\s+)?(?:grated\s+)?(?:juice|zest)(?:\s*(?:and|&|\/)\s*(?:juice|zest))?\s+of\s+(\d+\/\d+|\d+(?:[.,]\d+)?|one|two|three|half|a)\b/;

const AMOUNT_WORDS: Record<string, number> = {
  a: 1,
  one: 1,
  two: 2,
  three: 3,
  half: 0.5,
};

const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2',
  '¼': '1/4',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅛': '1/8',
};

const LEADING_QUANTITY =
  /^(\d+\s*-\s*\d+|\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*(fl\.?\s*oz|[a-z]+)?/;

const GRAMS_PER_ML: Record<string, number> = {
  flour: 0.53,
  cornflour: 0.53,
  'corn flour': 0.53,
  cornstarch: 0.53,
  'ground almonds': 0.4,
  sugar: 0.83,
  'brown sugar': 0.9,
  'icing sugar': 0.53,
  'powdered sugar': 0.53,
  salt: 1.2,
  'kosher salt': 0.6,
  'baking powder': 0.92,
  'baking soda': 0.92,
  'bicarbonate of soda': 0.92,
  'cream of tartar': 0.6,
  yeast: 0.56,
  gelatine: 0.47,
  gelatin: 0.47,
  cocoa: 0.36,
  cacao: 0.36,
  'cocoa powder': 0.36,
  paprika: 0.46,
  cumin: 0.4,
  cinnamon: 0.52,
  ginger: 0.4,
  'ground ginger': 0.35,
  turmeric: 0.6,
  'turmeric powder': 0.6,
  'garlic powder': 0.62,
  'curry powder': 0.42,
  'garam masala': 0.4,
  'chili powder': 0.53,
  'chilli powder': 0.53,
  'chilli flakes': 0.4,
  'chili flakes': 0.4,
  'red pepper flakes': 0.4,
  pepper: 0.46,
  'black pepper': 0.46,
  'cayenne pepper': 0.35,
  allspice: 0.38,
  nutmeg: 0.47,
  clove: 0.44,
  cloves: 0.44,
  'ground clove': 0.44,
  coriander: 0.33,
  'fennel seeds': 0.4,
  cardamom: 0.4,
  cardomom: 0.4,
  masala: 0.4,
  powder: 0.5,
  'pul biber': 0.4,
  savoury: 0.2,
  seed: 0.5,
  seeds: 0.5,
  'mustard seeds': 0.66,
  'sesame seeds': 0.6,
  'poppy seeds': 0.6,
  'khus khus': 0.6,
  spice: 0.4,
  seasoning: 0.4,
  saffron: 0.2,
  marjoram: 0.2,
  oregano: 0.2,
  thyme: 0.2,
  basil: 0.2,
  rosemary: 0.2,
  dill: 0.2,
  chive: 0.2,
  chives: 0.2,
  cilantro: 0.25,
  peppercorns: 0.6,
  sumac: 0.4,
  'ras el hanout': 0.4,
  sage: 0.15,
  mint: 0.15,
  parsley: 0.25,
  herbs: 0.2,
  garlic: 0.56,
  'garlic clove': 0.56,
  onion: 0.67,
  onions: 0.67,
  shallot: 0.6,
  shallots: 0.6,
  challots: 0.6,
  'spring onion': 0.4,
  'spring onions': 0.4,
  scallions: 0.4,
  chilli: 0.5,
  chili: 0.5,
  galangal: 0.4,
  lemongrass: 0.4,
  horseradish: 0.5,
  zest: 0.4,
  butter: 0.95,
  'peanut butter': 1.07,
  ghee: 0.9,
  lard: 0.85,
  tahini: 1,
  'tomato puree': 1.07,
  'tomato paste': 1.07,
  mayonnaise: 0.92,
  mustard: 1,
  yogurt: 1.03,
  yoghurt: 1.03,
  'sour cream': 1,
  'soured cream': 1,
  dip: 1,
  'creme fraiche': 1,
  'cream cheese': 0.97,
  jam: 1.33,
  miso: 1.15,
  paste: 1.1,
  capers: 0.6,
  'pine nuts': 0.6,
  nuts: 0.6,
  peanut: 0.6,
  peanuts: 0.6,
  almonds: 0.6,
  pistachio: 0.6,
  pistachios: 0.6,
  beans: 0.75,
  fat: 0.9,
  starch: 0.53,
  cheese: 0.4,
  parmesan: 0.33,
  breadcrumbs: 0.45,
  oats: 0.34,
  rice: 0.85,
  'desiccated coconut': 0.35,
};

const LIQUIDS = [
  'water',
  'milk',
  'coconut milk',
  'buttermilk',
  'cream',
  'oil',
  'sauce',
  'juice',
  'vinegar',
  'stock',
  'broth',
  'extract',
  'vanilla',
  'wine',
  'rice wine',
  'beer',
  'rum',
  'brandy',
  'sherry',
  'vodka',
  'whisky',
  'liqueur',
  'honey',
  'syrup',
  'molasses',
  'treacle',
  'ketchup',
  'tabasco',
  'sriracha',
  'hotsauce',
  'sake',
  'mirin',
];

const VOLUME_INGREDIENT_KEYS = [...Object.keys(GRAMS_PER_ML), ...LIQUIDS];

export function parseMeasure(
  measure: string,
  foodName?: string,
): ParsedMeasure {
  const original = measure;
  const normalized = measure.toLowerCase().trim();

  if (QUALITATIVE_MEASURE.test(normalized)) {
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

  const cupMatch = normalized.match(/([\d\s/]+)\s*cups?\b/i);
  if (cupMatch) {
    const grams = parseFraction(cupMatch[1]) * 150;
    return { grams, original, confidence: 'medium', method: 'volume' };
  }

  for (const [unit, mlPerUnit] of Object.entries(SPOON_ML)) {
    const regex = new RegExp(`([\\d\\s/]+)\\s*${unit}\\b`, 'i');
    const match = normalized.match(regex);
    if (match) {
      const gramsPerMl =
        (foodName && lookupVolumeIngredient(foodName)?.gramsPerMl) || 1;
      const grams = parseFraction(match[1]) * mlPerUnit * gramsPerMl;
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

export function parseQuantityUnit(
  measure: string,
  foodName: string,
): ParsedQuantity | null {
  const normalized = normalizeUnicodeFractions(measure.toLowerCase().trim());

  const fruitPart = normalized.match(FRUIT_PART);
  if (fruitPart) {
    const amount =
      AMOUNT_WORDS[fruitPart[1]] ??
      parseFraction(fruitPart[1].replace(',', '.'));
    return { quantity: round2(amount), unit: Unit.PIECES };
  }

  const match = normalized.match(LEADING_QUANTITY);
  if (!match) return null;

  const token = match[2]?.replace(/fl\.?\s*oz/, 'fl oz');
  if (
    QUALITATIVE_MEASURE.test(normalized) &&
    !(token && COUNTABLE_QUALITATIVE_TOKENS.has(token))
  ) {
    return null;
  }

  const amount = parseFraction(match[1].replace(',', '.'));
  if (amount <= 0) return null;

  if (!token) return { quantity: round2(amount), unit: Unit.PIECES };

  const catalogUnit = CATALOG_UNIT_TOKENS[token];
  if (catalogUnit) {
    const [unit, factor] = catalogUnit;
    return { quantity: round2(amount * factor), unit };
  }

  const spoonMl = SPOON_ML[token];
  if (spoonMl) {
    const ingredient = lookupVolumeIngredient(foodName);
    if (!ingredient) return null;
    const ml = amount * spoonMl;
    return ingredient.liquid
      ? { quantity: round2(ml), unit: Unit.ML }
      : { quantity: round2(ml * ingredient.gramsPerMl), unit: Unit.G };
  }

  if (LENGTH_TOKENS.has(token)) return null;

  return { quantity: round2(amount), unit: Unit.PIECES };
}

export function quantityToGrams(
  { quantity, unit }: ParsedQuantity,
  foodName: string,
): ParsedMeasure {
  const original = `${quantity} ${unit}`;
  switch (unit) {
    case Unit.G:
      return {
        grams: quantity,
        original,
        confidence: 'high',
        method: 'weight',
      };
    case Unit.KG:
      return {
        grams: quantity * 1000,
        original,
        confidence: 'high',
        method: 'weight',
      };
    case Unit.ML:
    case Unit.L: {
      const ml = unit === Unit.L ? quantity * 1000 : quantity;
      const gramsPerMl = lookupVolumeIngredient(foodName)?.gramsPerMl ?? 1;
      return {
        grams: ml * gramsPerMl,
        original,
        confidence: 'medium',
        method: 'volume',
      };
    }
    case Unit.CUPS:
      return {
        grams: quantity * 150,
        original,
        confidence: 'medium',
        method: 'volume',
      };
    case Unit.PIECES:
      return {
        grams: quantity * getAverageWeight(foodName),
        original,
        confidence: 'low',
        method: 'count',
      };
  }
}

export function lookupVolumeIngredient(
  foodName: string,
): { liquid: boolean; gramsPerMl: number } | null {
  const name = foodName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  let head: { key: string; end: number } | null = null;
  for (const key of VOLUME_INGREDIENT_KEYS) {
    const match = new RegExp(`\\b${key}\\b`).exec(name);
    if (!match) continue;
    const end = match.index + key.length;
    if (
      !head ||
      end > head.end ||
      (end === head.end && key.length > head.key.length)
    ) {
      head = { key, end };
    }
  }
  if (!head) return null;

  const gramsPerMl = GRAMS_PER_ML[head.key];
  return gramsPerMl === undefined
    ? { liquid: true, gramsPerMl: 1 }
    : { liquid: false, gramsPerMl };
}

function normalizeUnicodeFractions(text: string): string {
  return text.replace(/(\d?)\s*([½¼¾⅓⅔⅛])/g, (_, whole: string, frac) =>
    whole
      ? `${whole} ${UNICODE_FRACTIONS[frac as string]}`
      : UNICODE_FRACTIONS[frac as string],
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
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
