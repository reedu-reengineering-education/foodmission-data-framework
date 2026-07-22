import {
  buildUserPreferences,
  deriveUserSegment,
  extractOnboardingSurvey,
  formatUserRecordForApi,
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

  it('extracts onboarding survey fields into column updates', () => {
    expect(
      extractOnboardingSurvey({
        weeklyMeatConsumption: WeeklyMeatRange.FIVE_TO_NINE,
        weeklyBeefConsumption: WeeklyBeefFrequency.NEVER,
      }),
    ).toEqual({
      weeklyMeatConsumption: WeeklyMeatRange.FIVE_TO_NINE,
      weeklyBeefConsumption: WeeklyBeefFrequency.NEVER,
    });
  });

  it('rejects unknown onboarding survey fields', () => {
    expect(() =>
      extractOnboardingSurvey({ meatMeals: WeeklyMeatRange.FIVE_TO_NINE }),
    ).toThrow('Unknown onboardingSurvey field');
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

  it('formats user records for API without top-level baseline columns', () => {
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
