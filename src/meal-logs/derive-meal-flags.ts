import { FoodProduct } from '@prisma/client';
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
  isWholegrainProduct,
  offCategoryFacts,
  OffCategoryFacts,
} from '../food-products/utils/off-meal-facts';
import { conflictingFlags, eventsForFlags } from './meal-log-events';
import {
  ANCIENT_GRAIN_NEVO_CODES,
  isHighFibre,
  isNevoPlantFood,
  NevoFood,
  nevoHealthyFat,
  nevoProteinSource,
  ProteinSource,
  ProteinSourceValue,
  WHOLEGRAIN_NEVO_CODES,
} from './nevo-meal-facts';

export { ANCIENT_GRAIN_NEVO_CODES } from './nevo-meal-facts';

/** The parts of a meal item (with its food relation) the derivation reads. */
export interface DerivableMealItem {
  genericFood: NevoFood | null;
  foodProduct: Pick<
    FoodProduct,
    | 'barcode'
    | 'categories'
    | 'labels'
    | 'ingredientsAnalysisTags'
    | 'isVegan'
    | 'isVegetarian'
    | 'proteins'
    | 'fiber'
    | 'fat'
    | 'saturatedFat'
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
  /** Where the item's protein comes from; `null` when it isn't protein-rich. */
  proteinSource: ProteinSourceValue | null;
  highFibre: boolean;
  wholegrain: boolean;
  healthyFat: boolean;
  /** `GenericFood.id` when the item is a NEVO plant food (plant diversity). */
  plantFoodId: string | null;
}

const UNKNOWN_ITEM: ItemFacts = {
  meat: false,
  vegetarian: null,
  vegan: null,
  legume: false,
  ancientGrain: false,
  certified: false,
  proteinSource: null,
  highFibre: false,
  wholegrain: false,
  healthyFat: false,
  plantFoodId: null,
};

/**
 * Facts for one meal item. NEVO items use the curated `GenericFood` flags and
 * nutrients. OFF items use the tags and nutriments from the OFF Mongo copy
 * when given (`offFacts`), otherwise the ones stored on `FoodProduct`.
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
      proteinSource: nevoProteinSource(food),
      highFibre: isHighFibre(food.fiber),
      wholegrain: WHOLEGRAIN_NEVO_CODES.has(food.nevoCode),
      healthyFat: nevoHealthyFat(food),
      plantFoodId: isNevoPlantFood(food) ? food.id : null,
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
  const nutriments = {
    proteins: offFacts?.nutriments.proteins ?? product.proteins,
    fiber: offFacts?.nutriments.fiber ?? product.fiber,
    fat: offFacts?.nutriments.fat ?? product.fat,
    saturatedFat: offFacts?.nutriments.saturatedFat ?? product.saturatedFat,
  };
  const kinds = offCategoryFacts(categories);

  return {
    meat: kinds.meat,
    // A meat or fish category outranks a contradicting diet tag.
    vegetarian: kinds.meat ? false : isVegetarian,
    vegan: kinds.meat ? false : isVegan,
    legume: kinds.legume,
    ancientGrain: kinds.ancientGrain,
    certified: labels.some(isCertifiedLabel),
    proteinSource: offProteinSource(kinds, nutriments.proteins),
    highFibre: isHighFibre(nutriments.fiber),
    wholegrain: isWholegrainProduct([...categories, ...labels]),
    healthyFat: offHealthyFat(kinds, isVegetarian, nutriments),
    plantFoodId: null,
  };
}

/**
 * Same protein rules as NEVO (`nevoProteinSource`), by OFF category. When OFF
 * has no protein value, the category alone decides.
 */
function offProteinSource(
  kinds: OffCategoryFacts,
  proteins: number | null,
): ProteinSourceValue | null {
  const atLeast = (min: number) => proteins == null || proteins >= min;

  if (kinds.fish) return ProteinSource.FISH;
  if (kinds.meat) return ProteinSource.MEAT;
  if (kinds.eggs) return ProteinSource.EGGS;
  if (kinds.proteinDairy && atLeast(3.4)) return ProteinSource.DAIRY;
  if (kinds.soy) return ProteinSource.TOFU;
  if (kinds.nuts && atLeast(7)) return ProteinSource.NUTS;
  if (kinds.seeds && atLeast(7)) return ProteinSource.SEEDS;
  if (kinds.legume && atLeast(5)) return ProteinSource.LEGUMES;
  if (kinds.meatSubstitute && atLeast(8)) return ProteinSource.MEAT_SUBSTITUTE;
  return null;
}

/**
 * Same rule as NEVO (`nevoHealthyFat`): oily fish, or a vegetarian plant fat
 * source (oil, nuts, seeds, avocado, olives, margarine) whose fat is ≥ 10 g
 * per 100 g and at least two-thirds unsaturated. OFF has no mono/poly split,
 * so unsaturated is fat minus saturated; without fat values the category
 * alone decides.
 */
function offHealthyFat(
  kinds: OffCategoryFacts,
  isVegetarian: boolean | null,
  nutriments: { fat: number | null; saturatedFat: number | null },
): boolean {
  if (kinds.oilyFish) return true;
  if (!kinds.fatSource || isVegetarian === false) return false;
  const { fat, saturatedFat } = nutriments;
  if (fat == null || saturatedFat == null) return true;
  return fat >= 10 && fat - saturatedFat >= 2 * saturatedFat;
}

/** Everything derived from a meal's items. */
export interface DerivedMeal {
  flags: MealFlagEventType[];
  /** Distinct protein sources, for `NUTRITION_PROTEIN_VARIETY_LOGGED`. */
  proteinSources: ProteinSourceValue[];
  /** Distinct NEVO plant foods, for `NUTRITION_PLANT_DIVERSITY_COUNT`. */
  plantFoodIds: string[];
}

const NOTHING_DERIVED: DerivedMeal = {
  flags: [],
  proteinSources: [],
  plantFoodIds: [],
};

/**
 * Meal flags and per-food facts implied by a meal's items. "Any" flags (meat,
 * legume, ancient grain, certified, protein, high fibre, wholegrain, healthy
 * fat) need one item; meat-free and vegan need every item to be known
 * vegetarian / vegan, so one unknown item blocks them. No items, nothing.
 */
export function deriveMeal(
  items: readonly DerivableMealItem[],
  offFactsByBarcode: ReadonlyMap<string, OffMealFacts> = new Map(),
): DerivedMeal {
  if (items.length === 0) {
    return NOTHING_DERIVED;
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
  const proteinSources = [
    ...new Set(facts.map((f) => f.proteinSource).filter((s) => s != null)),
  ];

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
  if (proteinSources.length > 0) {
    derived.add(EventType.NUTRITION_PROTEIN_INCLUDED);
  }
  if (any((f) => f.highFibre)) derived.add(EventType.NUTRITION_HIGH_FIBRE_MEAL);
  if (any((f) => f.wholegrain)) {
    derived.add(EventType.NUTRITION_WHOLEGRAIN_CHOSEN);
  }
  if (any((f) => f.healthyFat)) {
    derived.add(EventType.NUTRITION_HEALTHY_FAT_CHOSEN);
  }

  return {
    flags: MEAL_FLAG_EVENT_TYPES.filter((flag) => derived.has(flag)),
    proteinSources,
    plantFoodIds: [
      ...new Set(facts.map((f) => f.plantFoodId).filter((id) => id != null)),
    ],
  };
}

/** The meal flags implied by a meal's items (see `deriveMeal`). */
export function deriveMealFlags(
  items: readonly DerivableMealItem[],
  offFactsByBarcode?: ReadonlyMap<string, OffMealFacts>,
): MealFlagEventType[] {
  return deriveMeal(items, offFactsByBarcode).flags;
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
