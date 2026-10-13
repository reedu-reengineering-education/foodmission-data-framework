import { EventType } from '../events/event-types';
import { wheelActionsForMealLog } from './meal-log-wheel-actions.config';

describe('wheelActionsForMealLog', () => {
  it('counts a vegan meal once, not also as vegetarian', () => {
    expect(
      wheelActionsForMealLog(
        [EventType.MEAL_VEGAN, EventType.MEAL_MEAT_FREE],
        [],
      ),
    ).toEqual(['VEGAN_MEAL']);
  });

  it('counts a meat-free meal as vegetarian', () => {
    expect(wheelActionsForMealLog([EventType.MEAL_MEAT_FREE], [])).toEqual([
      'VEGETARIAN_MEAL',
    ]);
  });

  it('maps food waste flags and swaps', () => {
    expect(
      wheelActionsForMealLog(
        [EventType.FOOD_WASTE_FULL_PLATE_SAVED, EventType.MEAL_LOCAL_PRODUCE],
        [EventType.SWAP_BEEF_TO_LEGUMES],
      ),
    ).toEqual(['FULL_PLATE_SAVED', 'BEEF_TO_LEGUMES_100G']);
  });

  it('ignores flags without an impact', () => {
    expect(
      wheelActionsForMealLog([EventType.NUTRITION_WHOLEGRAIN_CHOSEN], []),
    ).toEqual([]);
  });
});
