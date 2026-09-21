import {
  EventType,
  EventTypeValue,
  MealFlagEventType,
  MealSwapEventType,
} from '../events/event-types';

/**
 * Facts a reported flag implies beyond itself: stating a meal was vegan also
 * states it was meat-free, and missions counting `MEAL_MEAT_FREE` should see it.
 * Flags with nothing to imply are absent.
 */
const IMPLIED_FLAG_EVENTS: Partial<
  Record<MealFlagEventType, readonly MealFlagEventType[]>
> = {
  [EventType.MEAL_VEGAN]: [EventType.MEAL_MEAT_FREE],
};

/** Flags asserting the meal contained no meat or fish. */
const MEAT_FREE_FLAGS: ReadonlySet<string> = new Set<MealFlagEventType>([
  EventType.MEAL_MEAT_FREE,
  EventType.MEAL_VEGAN,
]);

/** `MEAL_MEAT_CONSUMED` contradicts any flag asserting the meal was meat-free. */
export function conflictingFlags(flags: readonly string[]): string[] {
  if (!flags.includes(EventType.MEAL_MEAT_CONSUMED)) return [];
  return flags.filter((flag) => MEAT_FREE_FLAGS.has(flag));
}

/**
 * Every `MEAL_*` event a set of flags records — the flags themselves plus what
 * they imply, deduped, in flag order.
 */
export function eventsForFlags(
  flags: readonly MealFlagEventType[],
): EventTypeValue[] {
  const seen = new Set<EventTypeValue>();
  for (const flag of flags) {
    seen.add(flag);
    for (const implied of IMPLIED_FLAG_EVENTS[flag] ?? []) seen.add(implied);
  }
  return [...seen];
}

/** Deduped swap events, in swap order. A swap is already its own event type. */
export function eventsForSwaps(
  swaps: readonly MealSwapEventType[],
): MealSwapEventType[] {
  return [...new Set(swaps)];
}

/** `SWAP_BEEF_TO_LEGUMES` → `{ from: 'BEEF', to: 'LEGUMES' }`. */
export function swapSides(swap: MealSwapEventType): {
  from: string;
  to: string;
} {
  const [from, to] = swap.slice('SWAP_'.length).split('_TO_');
  return { from, to };
}
