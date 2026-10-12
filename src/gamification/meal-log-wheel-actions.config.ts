import {
  EventType,
  MealFlagEventType,
  MealSwapEventType,
} from '../events/event-types';
import { WheelImpactActionCode } from './wheel-impact-actions.config';

/** Meal-log swaps that move the wheels, one action per swap. */
const SWAP_ACTIONS: Record<MealSwapEventType, WheelImpactActionCode> = {
  [EventType.SWAP_BEEF_TO_PORK]: 'BEEF_TO_PORK_100G',
  [EventType.SWAP_BEEF_TO_CHICKEN]: 'BEEF_TO_CHICKEN_100G',
  [EventType.SWAP_BEEF_TO_LEGUMES]: 'BEEF_TO_LEGUMES_100G',
  [EventType.SWAP_PORK_TO_CHICKEN]: 'PORK_TO_CHICKEN_100G',
  [EventType.SWAP_PORK_TO_LEGUMES]: 'PORK_TO_LEGUMES_100G',
  [EventType.SWAP_CHICKEN_TO_LEGUMES]: 'CHICKEN_TO_LEGUMES_100G',
  [EventType.SWAP_SUGARY_DRINK_TO_WATER]: 'SUGARY_DRINK_TO_WATER_250ML',
  [EventType.SWAP_SNACK_TO_FRUIT_NUTS]: 'SNACK_TO_FRUIT_OR_NUTS_30G',
  [EventType.SWAP_SUGARY_CEREAL_TO_OATS]: 'SUGARY_CEREAL_TO_OATS_FRUIT_30G',
  [EventType.SWAP_READY_MEAL_TO_HOMECOOKED]: 'READY_MEAL_TO_HOME_COOKED_400G',
  [EventType.SWAP_PROCESSED_MEAT_TO_LEGUMES]: 'PROCESSED_MEAT_TO_LEGUMES_50G',
};

/** Meal-log flags that move the wheels. Other flags don't. */
const FLAG_ACTIONS: Partial<Record<MealFlagEventType, WheelImpactActionCode>> =
  {
    [EventType.FOOD_WASTE_HALF_PLATE_SAVED]: 'HALF_PLATE_SAVED',
    [EventType.FOOD_WASTE_FULL_PLATE_SAVED]: 'FULL_PLATE_SAVED',
    [EventType.FOOD_WASTE_EXPIRED_CONSUMED]: 'EXPIRED_PRODUCT_CONSUMED',
  };

/**
 * Wheel actions one meal log earns. A vegan meal is also meat-free, so it
 * counts as vegan only, never both. Day-level facts (MEAL_VEGAN_DAY, ...) are
 * not mapped: they would double-count the meals already credited.
 */
export function wheelActionsForMealLog(
  flags: readonly MealFlagEventType[],
  swaps: readonly MealSwapEventType[],
): WheelImpactActionCode[] {
  const actions: WheelImpactActionCode[] = [];

  if (flags.includes(EventType.MEAL_VEGAN)) {
    actions.push('VEGAN_MEAL');
  } else if (flags.includes(EventType.MEAL_MEAT_FREE)) {
    actions.push('VEGETARIAN_MEAL');
  }

  for (const flag of new Set(flags)) {
    const action = FLAG_ACTIONS[flag];
    if (action) actions.push(action);
  }
  for (const swap of new Set(swaps)) {
    actions.push(SWAP_ACTIONS[swap]);
  }

  return actions;
}
