import {
  ContentLevel,
  DailyFruitVegServings,
  HabitFrequency,
  LabelFamiliarity,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyLegumeFrequency,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';
import {
  DIMENSION_SCORING,
  inferDimensionLevel,
  ONBOARDING_ANSWER_POINTS,
} from './dimension-levels.config';
import { ONBOARDING_SURVEY_FIELDS } from './onboarding.utils';
import { ONBOARDING_SURVEY_QUESTIONS } from './onboarding-survey.config';
import { dimensionSeedData } from '../../scripts/seeds/shared/dimensions-topics';

const DIMENSION_CODES = dimensionSeedData.map((d) => d.code);

describe('dimension levels', () => {
  describe('inferDimensionLevel', () => {
    it('sums the dimension answers into the survey framework bands', () => {
      // 1 + 1 + 0 = 2 -> beginner (0-2)
      expect(
        inferDimensionLevel('DIET_CHANGES', {
          weeklyMeatConsumption: WeeklyMeatRange.FIVE_TO_NINE,
          weeklyBeefConsumption: WeeklyBeefFrequency.ONE_TO_TWO_TIMES_PER_WEEK,
          weeklyLegumeConsumption: WeeklyLegumeFrequency.NEVER,
        }),
      ).toBe(ContentLevel.BEGINNER);

      // 1 + 1 + 1 = 3 -> intermediate (3-4)
      expect(
        inferDimensionLevel('NUTRITION_VALUES', {
          weeklyUpfConsumption: WeeklyUpfRange.FOUR_TO_NINE,
          wholeGrainFrequency: HabitFrequency.SOMETIMES,
          dailyFruitVegServings: DailyFruitVegServings.THREE_TO_FOUR,
        }),
      ).toBe(ContentLevel.INTERMEDIATE);

      // 2 + 2 + 1 = 5 -> advanced (5-6)
      expect(
        inferDimensionLevel('PRODUCTION_METHODS', {
          readsIngredientLists: HabitFrequency.ALWAYS,
          sustainabilityLabelFamiliarity: LabelFamiliarity.FAMILIAR,
          productionMethodsInfluence: HabitFrequency.SOMETIMES,
        }),
      ).toBe(ContentLevel.ADVANCED);
    });

    it('uses the two-question packaging bands (0-1 / 2-3 / 4)', () => {
      const level = (reusable: WeeklyReusableRange, disposal: HabitFrequency) =>
        inferDimensionLevel('PACKAGING', {
          weeklyReusableOrRefill: reusable,
          checksPackagingDisposal: disposal,
        });

      expect(
        level(WeeklyReusableRange.THREE_TO_SIX, HabitFrequency.RARELY),
      ).toBe(ContentLevel.BEGINNER);
      expect(
        level(WeeklyReusableRange.TEN_PLUS, HabitFrequency.SOMETIMES),
      ).toBe(ContentLevel.INTERMEDIATE);
      expect(
        level(WeeklyReusableRange.SEVEN_TO_NINE, HabitFrequency.OFTEN),
      ).toBe(ContentLevel.ADVANCED);
    });

    it('scores 1-2 food waste events per week as advanced behaviour', () => {
      expect(
        inferDimensionLevel('FOOD_WASTE', {
          weeklyFoodWaste: WeeklyFoodWasteRange.ONE_TO_TWO,
          plansMealsBeforeShopping: HabitFrequency.OFTEN,
          usesLeftovers: HabitFrequency.SOMETIMES,
        }),
      ).toBe(ContentLevel.ADVANCED);
    });

    it('counts skipped questions as 0 points', () => {
      // Only one question answered, best answer: 2 of 6 -> beginner.
      expect(
        inferDimensionLevel('DIET_CHANGES', {
          weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
        }),
      ).toBe(ContentLevel.BEGINNER);
      // 2 + 1 = 3 of 6 -> intermediate.
      expect(
        inferDimensionLevel('FOOD_WASTE', {
          weeklyFoodWaste: WeeklyFoodWasteRange.ZERO,
          usesLeftovers: HabitFrequency.SOMETIMES,
        }),
      ).toBe(ContentLevel.INTERMEDIATE);
      // Packaging: 2 of 4 -> intermediate.
      expect(
        inferDimensionLevel('PACKAGING', {
          weeklyReusableOrRefill: WeeklyReusableRange.TEN_PLUS,
          checksPackagingDisposal: null,
        }),
      ).toBe(ContentLevel.INTERMEDIATE);
    });

    it('starts a dimension with nothing answered as BEGINNER', () => {
      expect(inferDimensionLevel('PRODUCTION_METHODS', {})).toBe(
        ContentLevel.BEGINNER,
      );
    });

    it('starts an unscored dimension as BEGINNER', () => {
      expect(
        inferDimensionLevel('UNKNOWN', {
          weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
        }),
      ).toBe(ContentLevel.BEGINNER);
    });
  });

  it('scores every dimension in the catalog', () => {
    expect(Object.keys(DIMENSION_SCORING).sort()).toEqual(
      [...DIMENSION_CODES].sort(),
    );
  });

  it('assigns every survey question to exactly one dimension', () => {
    const scored = Object.values(DIMENSION_SCORING).flatMap((d) => d.fields);
    expect([...scored].sort()).toEqual([...ONBOARDING_SURVEY_FIELDS].sort());
  });

  it('defines points for every survey answer option', () => {
    for (const question of ONBOARDING_SURVEY_QUESTIONS) {
      for (const option of question.options) {
        expect(ONBOARDING_ANSWER_POINTS[question.field][option.value]).toEqual(
          expect.any(Number),
        );
      }
    }
  });
});
