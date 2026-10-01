import { FoodProduct, GenericFood } from '@prisma/client';
import {
  EventType,
  EventTypeValue,
  MEAL_FLAG_EVENT_TYPES,
  MealFlagEventType,
} from '../events/event-types';
import type { OffMealFacts } from '../food-products/repositories/off-mongo-product.repository';
import { parseOffDietFlags } from '../food-products/utils/off-diet-flags';
import {
  isCertifiedLabel,
  offCategoryFacts,
} from '../food-products/utils/off-meal-facts';
import { conflictingFlags, eventsForFlags } from './meal-log-events';

/**
 * NEVO foods that count as ancient grains: quinoa, millet, buckwheat, spelt.
 * NEVO has no field for it, so the codes are listed by hand.
 */
export const ANCIENT_GRAIN_NEVO_CODES: ReadonlySet<number> = new Set([
  // Quinoa raw, cooked
  3153, 3154,
  // Millet raw, boiled
  847, 2159,
  // Buckwheat flour, groats
  208, 1019,
  // Spelt flour, wholemeal flour, flakes
  5576, 5577, 5582,
]);

/** The parts of a meal item (with its food relation) the derivation reads. */
export interface DerivableMealItem {
  genericFood: Pick<
    GenericFood,
    'nevoCode' | 'vegan' | 'vegetarian' | 'meatOrFish' | 'legume'
  > | null;
  foodProduct: Pick<
    FoodProduct,
    | 'barcode'
    | 'categories'
    | 'labels'
    | 'ingredientsAnalysisTags'
    | 'isVegan'
    | 'isVegetarian'
  > | null;
}

/** `null` = the data doesn't say (OFF "maybe"/"unknown", or no food linked). */
export interface ItemFacts {
  meat: boolean;
  vegetarian: boolean | null;
  vegan: boolean | null;
  legume: boolean;
  ancientGrain: boolean;
  certified: boolean;
}

const UNKNOWN_ITEM: ItemFacts = {
  meat: false,
  vegetarian: null,
  vegan: null,
  legume: false,
  ancientGrain: false,
  certified: false,
};

/**
 * Facts for one meal item. NEVO items use the curated `GenericFood` flags.
 * OFF items use the tags from the OFF Mongo copy when given (`offFacts`),
 * otherwise the tags and diet flags stored on `FoodProduct`.
 */
export function itemFacts(
  item: DerivableMealItem,
  offFacts?: OffMealFacts,
): ItemFacts {
  const food = item.genericFood;
  if (food) {
    return {
      meat: food.meatOrFish,
      vegetarian: food.vegetarian,
      vegan: food.vegan,
      legume: food.legume,
      ancientGrain: ANCIENT_GRAIN_NEVO_CODES.has(food.nevoCode),
      certified: false,
    };
  }

  const product = item.foodProduct;
  if (!product) {
    return UNKNOWN_ITEM;
  }

  const categories = offFacts?.categories ?? product.categories;
  const labels = offFacts?.labels ?? product.labels;
  const diet = parseOffDietFlags(
    offFacts?.ingredientsAnalysisTags ?? product.ingredientsAnalysisTags,
    labels,
  );
  // Stored flags fill in when the tags don't decide (e.g. imported rows
  // that kept the flags but not the tags).
  const isVegan = diet.isVegan ?? product.isVegan;
  const isVegetarian = diet.isVegetarian ?? product.isVegetarian;
  const { meat, legume, ancientGrain } = offCategoryFacts(categories);

  return {
    meat,
    // A meat or fish category outranks a contradicting diet tag.
    vegetarian: meat ? false : isVegetarian,
    vegan: meat ? false : isVegan,
    legume,
    ancientGrain,
    certified: labels.some(isCertifiedLabel),
  };
}

/**
 * Meal flags implied by a meal's items. "Any" flags (meat, legume, ancient
 * grain, certified) need one item; meat-free and vegan need every item to be
 * known vegetarian / vegan, so one unknown item blocks them. No items, no flags.
 */
export function deriveMealFlags(
  items: readonly DerivableMealItem[],
  offFactsByBarcode: ReadonlyMap<string, OffMealFacts> = new Map(),
): MealFlagEventType[] {
  if (items.length === 0) {
    return [];
  }

  const facts = items.map((item) =>
    itemFacts(
      item,
      item.foodProduct?.barcode
        ? offFactsByBarcode.get(item.foodProduct.barcode)
        : undefined,
    ),
  );
  const any = (pick: (f: ItemFacts) => boolean) => facts.some(pick);
  const meat = any((f) => f.meat);

  const derived = new Set<MealFlagEventType>();
  if (meat) derived.add(EventType.MEAL_MEAT_CONSUMED);
  if (!meat && facts.every((f) => f.vegetarian === true)) {
    derived.add(EventType.MEAL_MEAT_FREE);
  }
  if (!meat && facts.every((f) => f.vegan === true)) {
    derived.add(EventType.MEAL_VEGAN);
  }
  if (any((f) => f.legume)) derived.add(EventType.MEAL_LEGUME_CONSUMED);
  if (any((f) => f.ancientGrain)) derived.add(EventType.MEAL_ANCIENT_GRAIN);
  if (any((f) => f.certified)) derived.add(EventType.MEAL_CERTIFIED_PRODUCT);

  return MEAL_FLAG_EVENT_TYPES.filter((flag) => derived.has(flag));
}

/** Who asserted a recorded meal fact: the client, the meal's food data, or both. */
export type FlagSource = 'user' | 'derived' | 'both';

export interface MergedFlags {
  /** Client flags plus the derived flags that don't contradict them. */
  flags: MealFlagEventType[];
  /** Source per recorded event, including events implied by a flag. */
  sources: Map<EventTypeValue, FlagSource>;
}

/**
 * Adds derived flags to the client's. The client wins: a derived flag that
 * contradicts a client flag (derived meat vs client meat-free/vegan, or the
 * reverse) is dropped. `clientFlags` must already be conflict-free.
 */
export function mergeDerivedFlags(
  clientFlags: readonly MealFlagEventType[],
  derived: readonly MealFlagEventType[],
): MergedFlags {
  const kept = derived.filter(
    (flag) =>
      clientFlags.includes(flag) ||
      conflictingFlags([...clientFlags, flag]).length === 0,
  );

  const flags = [...clientFlags];
  for (const flag of kept) {
    if (!flags.includes(flag)) flags.push(flag);
  }

  const fromUser = new Set(eventsForFlags(clientFlags));
  const fromData = new Set(eventsForFlags(kept));
  const sources = new Map<EventTypeValue, FlagSource>();
  for (const eventType of eventsForFlags(flags)) {
    const user = fromUser.has(eventType);
    const data = fromData.has(eventType);
    sources.set(eventType, user && data ? 'both' : user ? 'user' : 'derived');
  }

  return { flags, sources };
}
