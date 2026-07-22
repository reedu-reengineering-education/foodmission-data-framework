import {
  buildUserPreferences,
  extractOnboardingSurvey,
  formatUserRecordForApi,
  targetForSegment,
} from './onboarding.utils';
import {
  UserSegment,
  WeeklyMeatRange,
} from '@prisma/client';

describe('onboarding.utils', () => {
  it('maps segment to default targets', () => {
    expect(targetForSegment(UserSegment.BEGINNER)).toBe(10);
    expect(targetForSegment(null)).toBe(10);
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
