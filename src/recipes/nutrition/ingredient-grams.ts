import { Unit } from '@prisma/client';

export const ML_PER_CUP = 240;

export type WordTable = [RegExp, number][];

export function wordTable(values: Record<string, number>): WordTable {
  return Object.entries(values)
    .sort(([a], [b]) => b.length - a.length)
    .map(([word, value]) => [
      new RegExp(`\\b(?:${word})(?:s|es)?\\b`, 'i'),
      value,
    ]);
}

export function lookup(
  table: WordTable,
  texts: (string | null | undefined)[],
): number | undefined {
  for (const text of texts) {
    const hit = text
      ? table.find(([pattern]) => pattern.test(text))
      : undefined;
    if (hit) return hit[1];
  }
  return undefined;
}

export const SPICE_PEPPER =
  /\b(black|white|cayenne|ground|cracked)\s+peppers?\b|\bpeppercorns?\b|\bpepper (black|white|red cayenne)\b/i;

const DEFAULT_SOLID_GRAMS_PER_ML = 0.6;

const COUNT_WORD_GRAMS = wordTable({
  clove: 3,
  slice: 30,
  sprig: 2,
  can: 400,
  rasher: 25,
  piece: 50,
  strip: 20,
  leaf: 0.5,
  leaves: 0.5,
  knob: 15,
  scoop: 60,
});

const SIZE_FACTORS = wordTable({
  small: 0.7,
  medium: 1,
  large: 1.3,
});

const GRAMS_PER_ML: WordTable = [
  ...wordTable({
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
  }),
  [
    /\b(water|milk|buttermilk|cream|fraiche|yogh?urt|stock|broth|juice|vinegar|sauce|wine|beer|cider|brandy|rum|sherry|liqueur|vodka|whisky|extract|puree|passata|paste|ketchup|mayonnaise|mustard|stout|hotsauce)\b/i,
    1,
  ],
];

const AVERAGE_PIECE_GRAMS = wordTable({
  egg: 50,
  'egg yolk': 17,
  lemongrass: 15,
  prawn: 15,
  shrimp: 12,
  'egg white': 33,
  onion: 150,
  'red onion': 150,
  tomato: 120,
  'plum tomato': 60,
  potato: 150,
  carrot: 80,
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
  challot: 30,
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
  'scotch bonnet': 10,
  'spring onion': 15,
  scallion: 15,
  cabbage: 900,
  fennel: 230,
  sausage: 60,
  baguette: 250,
  pita: 60,
  'pita bread': 60,
  'star anise': 1,
  almond: 1.2,
  anchovy: 4,
  avocado: 150,
  bacon: 25,
  'streaky bacon': 15,
  'beef fillet': 180,
  cutlet: 150,
  olive: 4,
  'black pudding': 30,
  cube: 10,
  bread: 30,
  toast: 30,
  'crusty bread': 40,
  'bread roll': 60,
  bun: 60,
  'english muffin': 60,
  cashew: 1.5,
  hazelnut: 1.4,
  drumstick: 80,
  'chicken leg': 200,
  'chicken wing': 35,
  'duck leg': 200,
  'loin chop': 70,
  'pork chop': 170,
  'lamb shank': 250,
  'dried apricot': 8,
  prune: 8,
  falafel: 25,
  filo: 20,
  phyllo: 20,
  'gelatine leaf': 2,
  'taco shell': 13,
  'lasagne sheet': 18,
  'mars bar': 51,
  'meringue nest': 13,
  oreo: 11,
  'rice paper': 9,
  tofu: 400,
});

function pieceGrams(
  quantity: number,
  foodNames: string[],
  measure: string | null | undefined,
): number | null {
  const perCountWord = lookup(COUNT_WORD_GRAMS, [measure]);
  if (perCountWord !== undefined) return quantity * perCountWord;
  if (foodNames.some((name) => SPICE_PEPPER.test(name))) return null;

  const average = lookup(AVERAGE_PIECE_GRAMS, foodNames);
  if (average === undefined) return null;
  return quantity * average * (lookup(SIZE_FACTORS, [measure]) ?? 1);
}

export function quantityToGrams(
  { quantity, unit }: { quantity: number; unit: Unit },
  foodNames: string[],
  measure?: string | null,
): number | null {
  const gramsPerMl = () =>
    lookup(GRAMS_PER_ML, foodNames) ?? DEFAULT_SOLID_GRAMS_PER_ML;
  switch (unit) {
    case Unit.G:
      return quantity;
    case Unit.KG:
      return quantity * 1000;
    case Unit.ML:
      return quantity * gramsPerMl();
    case Unit.L:
      return quantity * 1000 * gramsPerMl();
    case Unit.CUPS:
      return quantity * ML_PER_CUP * gramsPerMl();
    case Unit.PIECES:
      return pieceGrams(quantity, foodNames, measure);
    default:
      return null;
  }
}
