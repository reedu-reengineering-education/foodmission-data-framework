import {
  deriveUserSegment,
  targetForSegment,
  SOFT_PROGRESS_INDICATOR_KINDS,
} from './onboarding.utils';
import {
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';

describe('onboarding.utils', () => {
  it('exposes seven soft indicator kinds', () => {
    expect(SOFT_PROGRESS_INDICATOR_KINDS).toHaveLength(7);
  });

  it('maps segment to default targets', () => {
    expect(targetForSegment(UserSegment.BEGINNER)).toBe(10);
    expect(targetForSegment(UserSegment.INTERMEDIATE)).toBe(20);
    expect(targetForSegment(UserSegment.ADVANCED)).toBe(30);
    expect(targetForSegment(null)).toBe(10);
  });

  it('derives BEGINNER for high-impact baselines', () => {
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

  it('derives ADVANCED for low-impact baselines', () => {
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
});
