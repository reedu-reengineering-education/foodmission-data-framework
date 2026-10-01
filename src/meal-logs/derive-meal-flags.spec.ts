import { EventType } from '../events/event-types';
import {
  DerivableMealItem,
  deriveMeal,
  deriveMealFlags,
  mergeDerivedFlags,
} from './derive-meal-flags';

const nevo = (
  overrides: Partial<NonNullable<DerivableMealItem['genericFood']>> = {},
): DerivableMealItem => ({
  genericFood: {
    id: 'g-rice',
    nevoCode: 5,
    foodGroup: 'Cereal products and types of flour',
    foodName: 'Rice white raw',
    vegan: true,
    vegetarian: true,
    meatOrFish: false,
    legume: false,
    proteins: null,
    fiber: null,
    fat: null,
    saturatedFat: null,
    monoUnsaturatedFat: null,
    polyUnsaturatedFat: null,
    omega3Fat: null,
    ...overrides,
  },
  foodProduct: null,
});

const off = (
  overrides: Partial<NonNullable<DerivableMealItem['foodProduct']>> = {},
): DerivableMealItem => ({
  genericFood: null,
  foodProduct: {
    barcode: '123',
    categories: [],
    labels: [],
    ingredientsAnalysisTags: [],
    isVegan: true,
    isVegetarian: true,
    proteins: null,
    fiber: null,
    fat: null,
    saturatedFat: null,
    ...overrides,
  },
});

const noNutriments = {
  proteins: null,
  fiber: null,
  fat: null,
  saturatedFat: null,
};

describe('deriveMealFlags', () => {
  it('derives legume, meat-free and vegan for lentils with rice', () => {
    const lentils = nevo({ nevoCode: 120, legume: true });
    const rice = nevo({ nevoCode: 5 });

    expect(deriveMealFlags([lentils, rice])).toEqual([
      EventType.MEAL_MEAT_FREE,
      EventType.MEAL_VEGAN,
      EventType.MEAL_LEGUME_CONSUMED,
    ]);
  });

  it('derives meat and no meat-free flag when any item is meat', () => {
    const chicken = nevo({ vegan: false, vegetarian: false, meatOrFish: true });

    expect(deriveMealFlags([chicken, nevo()])).toEqual([
      EventType.MEAL_MEAT_CONSUMED,
    ]);
  });

  it('keeps vegetarian-but-not-vegan meals meat-free only', () => {
    const cheese = nevo({ vegan: false });

    expect(deriveMealFlags([cheese, nevo()])).toEqual([
      EventType.MEAL_MEAT_FREE,
    ]);
  });

  it('lets an OFF item with unknown diet status block meat-free and vegan', () => {
    const unknown = off({ isVegan: null, isVegetarian: null });

    expect(deriveMealFlags([nevo(), unknown])).toEqual([]);
  });

  it('does not count a non-vegetarian OFF product as meat without a meat category', () => {
    const gummies = off({ isVegan: false, isVegetarian: false });

    expect(deriveMealFlags([gummies])).toEqual([]);
  });

  it('counts an OFF meat category as meat even if the diet tags disagree', () => {
    const ham = off({ categories: ['en:meats', 'en:hams'] });

    expect(deriveMealFlags([ham])).toEqual([
      EventType.MEAL_MEAT_CONSUMED,
      EventType.NUTRITION_PROTEIN_INCLUDED,
    ]);
  });

  it('derives certified product from a certification label only', () => {
    expect(deriveMealFlags([off({ labels: ['en:eu-organic'] })])).toContain(
      EventType.MEAL_CERTIFIED_PRODUCT,
    );
    expect(
      deriveMealFlags([off({ labels: ['en:fsc', 'en:green-dot'] })]),
    ).not.toContain(EventType.MEAL_CERTIFIED_PRODUCT);
  });

  it('derives ancient grain from curated NEVO codes', () => {
    expect(deriveMealFlags([nevo({ nevoCode: 3153 })])).toContain(
      EventType.MEAL_ANCIENT_GRAIN,
    );
    expect(deriveMealFlags([nevo({ nevoCode: 5 })])).not.toContain(
      EventType.MEAL_ANCIENT_GRAIN,
    );
  });

  it('prefers OFF Mongo tags over the stored product fields', () => {
    const imported = off({ isVegan: null, isVegetarian: null });
    const mongo = new Map([
      [
        '123',
        {
          categories: ['en:legumes', 'en:lentils'],
          labels: ['en:organic'],
          ingredientsAnalysisTags: ['en:vegan', 'en:vegetarian'],
          nutriments: noNutriments,
        },
      ],
    ]);

    expect(deriveMealFlags([imported], mongo)).toEqual([
      EventType.MEAL_MEAT_FREE,
      EventType.MEAL_VEGAN,
      EventType.MEAL_LEGUME_CONSUMED,
      EventType.MEAL_CERTIFIED_PRODUCT,
      // A legume category without a protein value counts as protein-rich.
      EventType.NUTRITION_PROTEIN_INCLUDED,
    ]);
  });

  it('falls back to stored product fields without Mongo tags', () => {
    const stored = off({ categories: ['en:hummus'], labels: ['en:pdo'] });

    expect(deriveMealFlags([stored], new Map())).toEqual([
      EventType.MEAL_MEAT_FREE,
      EventType.MEAL_VEGAN,
      EventType.MEAL_LEGUME_CONSUMED,
      EventType.MEAL_CERTIFIED_PRODUCT,
      // A legume category without a protein value counts as protein-rich.
      EventType.NUTRITION_PROTEIN_INCLUDED,
    ]);
  });

  it('reads diet status from stored tags when the stored flags are empty', () => {
    const seeded = off({
      isVegan: null,
      isVegetarian: null,
      ingredientsAnalysisTags: ['en:vegan', 'en:vegetarian'],
    });

    expect(deriveMealFlags([seeded])).toEqual([
      EventType.MEAL_MEAT_FREE,
      EventType.MEAL_VEGAN,
    ]);
  });

  it('derives nothing for a meal without items or with unlinked items', () => {
    expect(deriveMealFlags([])).toEqual([]);
    expect(deriveMealFlags([{ genericFood: null, foodProduct: null }])).toEqual(
      [],
    );
  });
});

describe('deriveMeal: nutrition facts', () => {
  const lentils = nevo({
    id: 'g-lentils',
    nevoCode: 5174,
    foodGroup: 'Legumes',
    foodName: 'Lentils red boiled',
    legume: true,
    proteins: 9,
    fiber: 7.9,
  });
  const oatFlakes = nevo({
    id: 'g-oats',
    nevoCode: 213,
    foodName: 'Oat flakes',
    proteins: 13,
    fiber: 9,
  });
  const oliveOil = nevo({
    id: 'g-olive-oil',
    nevoCode: 601,
    foodGroup: 'Fats and oils',
    foodName: 'Oil olive',
    fat: 100,
    saturatedFat: 14,
    monoUnsaturatedFat: 73,
    polyUnsaturatedFat: 9,
  });
  const salmon = nevo({
    id: 'g-salmon',
    nevoCode: 1587,
    foodGroup: 'Fish, crustacean and shellfish',
    foodName: 'Salmon farmed raw',
    vegan: false,
    vegetarian: false,
    meatOrFish: true,
    proteins: 20,
    fat: 13,
    omega3Fat: 2.5,
  });

  it('derives protein, fibre, wholegrain and healthy fat from NEVO nutrients', () => {
    const { flags } = deriveMeal([lentils, oatFlakes, oliveOil]);

    expect(flags).toEqual(
      expect.arrayContaining([
        EventType.NUTRITION_PROTEIN_INCLUDED,
        EventType.NUTRITION_HIGH_FIBRE_MEAL,
        EventType.NUTRITION_WHOLEGRAIN_CHOSEN,
        EventType.NUTRITION_HEALTHY_FAT_CHOSEN,
      ]),
    );
  });

  it('derives none of them for plain rice', () => {
    const { flags } = deriveMeal([nevo({ proteins: 7, fiber: 1.4 })]);

    expect(flags).not.toEqual(
      expect.arrayContaining([EventType.NUTRITION_PROTEIN_INCLUDED]),
    );
    expect(flags).not.toContain(EventType.NUTRITION_HIGH_FIBRE_MEAL);
    expect(flags).not.toContain(EventType.NUTRITION_WHOLEGRAIN_CHOSEN);
    expect(flags).not.toContain(EventType.NUTRITION_HEALTHY_FAT_CHOSEN);
  });

  it('counts oily fish as a healthy fat but not fatty meat', () => {
    expect(deriveMeal([salmon]).flags).toContain(
      EventType.NUTRITION_HEALTHY_FAT_CHOSEN,
    );
    const pork = nevo({
      foodGroup: 'Meat and poultry',
      foodName: 'Pork belly raw',
      vegetarian: false,
      vegan: false,
      meatOrFish: true,
      fat: 30,
      saturatedFat: 10,
      monoUnsaturatedFat: 14,
      polyUnsaturatedFat: 6,
    });
    expect(deriveMeal([pork]).flags).not.toContain(
      EventType.NUTRITION_HEALTHY_FAT_CHOSEN,
    );
  });

  it('lists distinct protein sources and NEVO plant foods', () => {
    const peanutButter = nevo({
      id: 'g-pb',
      nevoCode: 455,
      foodGroup: 'Savoury bread spreads',
      foodName: 'Peanut butter',
      legume: true,
      proteins: 23,
    });

    const meal = deriveMeal([lentils, salmon, peanutButter, oatFlakes]);

    expect(meal.proteinSources).toEqual(['LEGUMES', 'FISH', 'NUTS']);
    expect(meal.plantFoodIds).toEqual(['g-lentils', 'g-pb', 'g-oats']);
  });

  it('uses OFF nutriments and categories for products', () => {
    const product = off({ barcode: '999' });
    const mongo = new Map([
      [
        '999',
        {
          categories: ['en:whole-grain-pastas'],
          labels: [],
          ingredientsAnalysisTags: ['en:vegan', 'en:vegetarian'],
          nutriments: { ...noNutriments, fiber: 7 },
        },
      ],
    ]);

    const meal = deriveMeal([product], mongo);

    expect(meal.flags).toEqual(
      expect.arrayContaining([
        EventType.NUTRITION_HIGH_FIBRE_MEAL,
        EventType.NUTRITION_WHOLEGRAIN_CHOSEN,
      ]),
    );
    // OFF products never count toward plant diversity (no genericFoodId).
    expect(meal.plantFoodIds).toEqual([]);
  });

  it('rejects an OFF fat source whose fat is mostly saturated', () => {
    const coconutOil = off({
      categories: ['en:vegetable-oils'],
      fat: 100,
      saturatedFat: 87,
    });

    expect(deriveMeal([coconutOil]).flags).not.toContain(
      EventType.NUTRITION_HEALTHY_FAT_CHOSEN,
    );
  });
});

describe('mergeDerivedFlags', () => {
  it('drops a derived flag that contradicts a client flag', () => {
    const { flags } = mergeDerivedFlags(
      [EventType.MEAL_MEAT_FREE],
      [EventType.MEAL_MEAT_CONSUMED, EventType.MEAL_LEGUME_CONSUMED],
    );

    expect(flags).toEqual([
      EventType.MEAL_MEAT_FREE,
      EventType.MEAL_LEGUME_CONSUMED,
    ]);
  });

  it('drops derived meat-free and vegan against a client meat flag', () => {
    const { flags } = mergeDerivedFlags(
      [EventType.MEAL_MEAT_CONSUMED],
      [EventType.MEAL_MEAT_FREE, EventType.MEAL_VEGAN],
    );

    expect(flags).toEqual([EventType.MEAL_MEAT_CONSUMED]);
  });

  it('records the source of every event, including implied ones', () => {
    const { sources } = mergeDerivedFlags(
      [EventType.MEAL_VEGAN],
      [EventType.MEAL_MEAT_FREE, EventType.MEAL_LEGUME_CONSUMED],
    );

    expect(Object.fromEntries(sources)).toEqual({
      [EventType.MEAL_VEGAN]: 'user',
      // Implied by the client's MEAL_VEGAN and derived from the items.
      [EventType.MEAL_MEAT_FREE]: 'both',
      [EventType.MEAL_LEGUME_CONSUMED]: 'derived',
    });
  });
});
