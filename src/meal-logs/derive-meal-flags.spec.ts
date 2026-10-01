import { EventType } from '../events/event-types';
import {
  DerivableMealItem,
  deriveMealFlags,
  mergeDerivedFlags,
} from './derive-meal-flags';

const nevo = (
  overrides: Partial<NonNullable<DerivableMealItem['genericFood']>> = {},
): DerivableMealItem => ({
  genericFood: {
    nevoCode: 5,
    vegan: true,
    vegetarian: true,
    meatOrFish: false,
    legume: false,
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
    ...overrides,
  },
});

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

    expect(deriveMealFlags([ham])).toEqual([EventType.MEAL_MEAT_CONSUMED]);
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
        },
      ],
    ]);

    expect(deriveMealFlags([imported], mongo)).toEqual([
      EventType.MEAL_MEAT_FREE,
      EventType.MEAL_VEGAN,
      EventType.MEAL_LEGUME_CONSUMED,
      EventType.MEAL_CERTIFIED_PRODUCT,
    ]);
  });

  it('falls back to stored product fields without Mongo tags', () => {
    const stored = off({ categories: ['en:hummus'], labels: ['en:pdo'] });

    expect(deriveMealFlags([stored], new Map())).toEqual([
      EventType.MEAL_MEAT_FREE,
      EventType.MEAL_VEGAN,
      EventType.MEAL_LEGUME_CONSUMED,
      EventType.MEAL_CERTIFIED_PRODUCT,
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
