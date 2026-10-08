import {
  DailyFruitVegServings,
  HabitFrequency,
  LabelFamiliarity,
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyLegumeFrequency,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';
import { deriveUserSegment, rankToSegment } from './onboarding-scoring';

describe('onboarding-scoring', () => {
  it.each([
    [0, UserSegment.ADVANCED],
    [0.4, UserSegment.ADVANCED],
    [0.5, UserSegment.INTERMEDIATE],
    [1.4, UserSegment.INTERMEDIATE],
    [1.5, UserSegment.BEGINNER],
    [2, UserSegment.BEGINNER],
  ])('rounds average rank %p to %p', (rank, segment) => {
    expect(rankToSegment(rank)).toBe(segment);
  });

  describe('deriveUserSegment', () => {
    it('is ADVANCED when every dimension scores advanced', () => {
      expect(
        deriveUserSegment({
          weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
          weeklyBeefConsumption: WeeklyBeefFrequency.NEVER,
          weeklyLegumeConsumption: WeeklyLegumeFrequency.DAILY,
          checksCountryOfOrigin: HabitFrequency.ALWAYS,
          choosesSeasonalProduce: HabitFrequency.ALWAYS,
          considersSustainabilityInfo: HabitFrequency.ALWAYS,
          readsIngredientLists: HabitFrequency.ALWAYS,
          sustainabilityLabelFamiliarity: LabelFamiliarity.VERY_FAMILIAR,
          productionMethodsInfluence: HabitFrequency.ALWAYS,
          weeklyReusableOrRefill: WeeklyReusableRange.TEN_PLUS,
          checksPackagingDisposal: HabitFrequency.ALWAYS,
          weeklyFoodWaste: WeeklyFoodWasteRange.ZERO,
          plansMealsBeforeShopping: HabitFrequency.ALWAYS,
          usesLeftovers: HabitFrequency.ALWAYS,
          weeklyUpfConsumption: WeeklyUpfRange.ZERO_TO_THREE,
          wholeGrainFrequency: HabitFrequency.ALWAYS,
          dailyFruitVegServings: DailyFruitVegServings.FIVE_PLUS,
        }),
      ).toBe(UserSegment.ADVANCED);
    });

    it('averages over all six dimensions, skipped ones as BEGINNER', () => {
      // DIET_CHANGES + FOOD_WASTE advanced (0), PACKAGING intermediate (1),
      // three unanswered dimensions beginner (2): 7 / 6 -> intermediate.
      expect(
        deriveUserSegment({
          weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
          weeklyBeefConsumption: WeeklyBeefFrequency.NEVER,
          weeklyLegumeConsumption: WeeklyLegumeFrequency.DAILY,
          weeklyFoodWaste: WeeklyFoodWasteRange.ZERO,
          plansMealsBeforeShopping: HabitFrequency.ALWAYS,
          usesLeftovers: HabitFrequency.OFTEN,
          weeklyReusableOrRefill: WeeklyReusableRange.TEN_PLUS,
        }),
      ).toBe(UserSegment.INTERMEDIATE);
    });

    it('is BEGINNER when only the five weekly questions are answered', () => {
      expect(
        deriveUserSegment({
          weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
          weeklyBeefConsumption: WeeklyBeefFrequency.NEVER,
          weeklyFoodWaste: WeeklyFoodWasteRange.ZERO,
          weeklyUpfConsumption: WeeklyUpfRange.ZERO_TO_THREE,
          weeklyReusableOrRefill: WeeklyReusableRange.TEN_PLUS,
        }),
      ).toBe(UserSegment.BEGINNER);
    });

    it('is BEGINNER when every question was skipped', () => {
      expect(deriveUserSegment({})).toBe(UserSegment.BEGINNER);
    });
  });
});
