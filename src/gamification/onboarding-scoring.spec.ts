import {
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';
import {
  computeAverageRank,
  deriveUserSegment,
  rankToSegment,
} from './onboarding-scoring';

describe('onboarding-scoring', () => {
  it('scores the best answer on every question as rank 0', () => {
    expect(
      computeAverageRank({
        weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
        weeklyBeefConsumption: WeeklyBeefFrequency.NEVER,
        weeklyFoodWaste: WeeklyFoodWasteRange.ZERO,
        weeklyUpfConsumption: WeeklyUpfRange.ZERO_TO_THREE,
        // best reuse answer is the *last* enum value (opposite polarity)
        weeklyReusableOrRefill: WeeklyReusableRange.TEN_PLUS,
      }),
    ).toBe(0);
  });

  it('scores the worst answer on every question as rank 2', () => {
    expect(
      computeAverageRank({
        weeklyMeatConsumption: WeeklyMeatRange.FIFTEEN_PLUS,
        weeklyBeefConsumption: WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK,
        weeklyFoodWaste: WeeklyFoodWasteRange.FIVE_PLUS,
        weeklyUpfConsumption: WeeklyUpfRange.FIFTEEN_PLUS,
        // worst reuse answer is the *first* enum value (opposite polarity)
        weeklyReusableOrRefill: WeeklyReusableRange.ZERO_TO_TWO,
      }),
    ).toBe(2);
  });

  it.each([
    [0, UserSegment.ADVANCED],
    [0.4, UserSegment.ADVANCED],
    [0.5, UserSegment.INTERMEDIATE],
    [1, UserSegment.INTERMEDIATE],
    [1.4, UserSegment.INTERMEDIATE],
    [1.5, UserSegment.BEGINNER],
    [2, UserSegment.BEGINNER],
  ])('maps average rank %p to %s', (rank, segment) => {
    expect(rankToSegment(rank)).toBe(segment);
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

  it('derives INTERMEDIATE for a mixed set of answers', () => {
    expect(
      deriveUserSegment({
        weeklyMeatConsumption: WeeklyMeatRange.FIVE_TO_NINE,
        weeklyBeefConsumption: WeeklyBeefFrequency.ONE_TO_TWO_TIMES_PER_WEEK,
        weeklyFoodWaste: WeeklyFoodWasteRange.ONE_TO_TWO,
        weeklyUpfConsumption: WeeklyUpfRange.FOUR_TO_NINE,
        weeklyReusableOrRefill: WeeklyReusableRange.THREE_TO_SIX,
      }),
    ).toBe(UserSegment.INTERMEDIATE);
  });
});
