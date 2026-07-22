import {
  buildUserPreferences,
  deriveUserSegment,
  extractOnboardingSurvey,
  formatUserRecordForApi,
  targetForSegment,
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
  it('maps segment to default targets', () => {
    expect(targetForSegment(UserSegment.BEGINNER)).toBe(10);
    expect(targetForSegment(null)).toBe(10);
  });

  it('derives BEGINNER vs ADVANCED from baselines', () => {
    expect(
      deriveUserSegment({
        weeklyMeatConsumption: WeeklyMeatRange.FIFTEEN_PLUS,
        weeklyBeefConsumption: WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK,
        weeklyFoodWaste: WeeklyFoodWasteRange.FIVE_PLUS,
        weeklyUpfConsumption: WeeklyUpfRange.FIFTEEN_PLUS,
        weeklyReusableOrRefill: WeeklyReusableRange.ZERO_TO_TWO,
      }),
    ).toBe(UserSegment.BEGINNER);

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

  it('extracts known onboarding survey fields', () => {
    expect(
      extractOnboardingSurvey({
        weeklyMeatConsumption: WeeklyMeatRange.FIVE_TO_NINE,
        meatMeals: 'ignored',
      }),
    ).toEqual({
      weeklyMeatConsumption: WeeklyMeatRange.FIVE_TO_NINE,
    });
  });

  it('rejects invalid onboarding survey enum values', () => {
    expect(() =>
      extractOnboardingSurvey({ weeklyMeatConsumption: 'NOT_A_REAL_VALUE' }),
    ).toThrow('Invalid value for weeklyMeatConsumption');
  });

  it('builds preferences with onboardingSurvey from columns', () => {
    expect(
      buildUserPreferences(
        { motivation: 'HEALTH', onboardingSurvey: { stale: true } },
        {
          weeklyMeatConsumption: WeeklyMeatRange.FIVE_TO_NINE,
          weeklyBeefConsumption: null,
          weeklyFoodWaste: null,
          weeklyUpfConsumption: null,
          weeklyReusableOrRefill: null,
        },
      ),
    ).toEqual({
      motivation: 'HEALTH',
      onboardingSurvey: {
        weeklyMeatConsumption: WeeklyMeatRange.FIVE_TO_NINE,
      },
    });
  });

  it('formats user records without top-level baseline columns', () => {
    expect(
      formatUserRecordForApi({
        id: 'u1',
        weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
        preferences: { motivation: 'HEALTH' },
      }),
    ).toEqual({
      id: 'u1',
      preferences: {
        motivation: 'HEALTH',
        onboardingSurvey: {
          weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
        },
      },
    });
  });
});
