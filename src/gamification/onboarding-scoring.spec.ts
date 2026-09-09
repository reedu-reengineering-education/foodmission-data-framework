import {
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';
import {
  computeImprovementScore,
  deriveUserSegment,
  scoreToSegment,
} from './onboarding-scoring';

describe('onboarding-scoring', () => {
  it('scores the best answer on every question as 0', () => {
    expect(
      computeImprovementScore({
        weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
        weeklyBeefConsumption: WeeklyBeefFrequency.NEVER,
        weeklyFoodWaste: WeeklyFoodWasteRange.ZERO,
        weeklyUpfConsumption: WeeklyUpfRange.ZERO_TO_THREE,
        // best reuse answer is the *last* enum value (opposite polarity)
        weeklyReusableOrRefill: WeeklyReusableRange.TEN_PLUS,
      }),
    ).toBe(0);
  });

  it('scores the worst answer on every question as 15', () => {
    expect(
      computeImprovementScore({
        weeklyMeatConsumption: WeeklyMeatRange.FIFTEEN_PLUS,
        weeklyBeefConsumption: WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK,
        weeklyFoodWaste: WeeklyFoodWasteRange.FIVE_PLUS,
        weeklyUpfConsumption: WeeklyUpfRange.FIFTEEN_PLUS,
        // worst reuse answer is the *first* enum value (opposite polarity)
        weeklyReusableOrRefill: WeeklyReusableRange.ZERO_TO_TWO,
      }),
    ).toBe(15);
  });

  it.each([
    [0, UserSegment.ADVANCED],
    [4, UserSegment.ADVANCED],
    [5, UserSegment.INTERMEDIATE],
    [9, UserSegment.INTERMEDIATE],
    [10, UserSegment.BEGINNER],
    [15, UserSegment.BEGINNER],
  ])('maps score %i to %s', (score, segment) => {
    expect(scoreToSegment(score)).toBe(segment);
  });

  it('derives ADVANCED for an already-sustainable set of answers', () => {
    expect(
      deriveUserSegment({
        weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
        weeklyBeefConsumption: WeeklyBeefFrequency.NEVER,
        weeklyFoodWaste: WeeklyFoodWasteRange.ZERO,
        weeklyUpfConsumption: WeeklyUpfRange.ZERO_TO_THREE,
        weeklyReusableOrRefill: WeeklyReusableRange.TEN_PLUS,
      }),
    ).toBe(UserSegment.ADVANCED);
  });

  it('derives BEGINNER for a low-sustainability set of answers', () => {
    expect(
      deriveUserSegment({
        weeklyMeatConsumption: WeeklyMeatRange.FIFTEEN_PLUS,
        weeklyBeefConsumption: WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK,
        weeklyFoodWaste: WeeklyFoodWasteRange.FIVE_PLUS,
        weeklyUpfConsumption: WeeklyUpfRange.FIFTEEN_PLUS,
        weeklyReusableOrRefill: WeeklyReusableRange.ZERO_TO_TWO,
      }),
    ).toBe(UserSegment.BEGINNER);
  });
});
