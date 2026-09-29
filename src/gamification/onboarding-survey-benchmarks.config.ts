import {
  UserSegment,
  WeeklyFoodWasteRange,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';

export interface OnboardingBenchmarkBand {
  segment: UserSegment;
  label: string;
}

/**
 * Weekly-frequency benchmark bands for 4 of the 5 onboarding categories,
 * sourced from the FOODMISSION user-segment reference table (Figure 9).
 * weeklyBeefConsumption has no benchmark table and keeps the ordinal
 * fallback in onboarding-scoring.ts.
 *
 * Reuse/refill is the one inverted category: more actions per week is more
 * sustainable, so its highest-frequency bands map to ADVANCED.
 */
export const ONBOARDING_SURVEY_BENCHMARKS = {
  weeklyMeatConsumption: {
    [WeeklyMeatRange.ZERO_TO_FOUR]: {
      segment: UserSegment.ADVANCED,
      label: '0-4 meals per week',
    },
    [WeeklyMeatRange.FIVE_TO_NINE]: {
      segment: UserSegment.INTERMEDIATE,
      label: '5-9 meals per week',
    },
    [WeeklyMeatRange.TEN_TO_FOURTEEN]: {
      segment: UserSegment.BEGINNER,
      label: '10-14 meals per week',
    },
    [WeeklyMeatRange.FIFTEEN_PLUS]: {
      segment: UserSegment.BEGINNER,
      label: '15+ meals per week',
    },
  },
  weeklyFoodWaste: {
    [WeeklyFoodWasteRange.ZERO]: {
      segment: UserSegment.ADVANCED,
      label: '0 events per week',
    },
    [WeeklyFoodWasteRange.ONE_TO_TWO]: {
      segment: UserSegment.INTERMEDIATE,
      label: '1-2 events per week',
    },
    [WeeklyFoodWasteRange.THREE_TO_FOUR]: {
      segment: UserSegment.BEGINNER,
      label: '3-4 events per week',
    },
    [WeeklyFoodWasteRange.FIVE_PLUS]: {
      segment: UserSegment.BEGINNER,
      label: '5+ events per week',
    },
  },
  weeklyUpfConsumption: {
    [WeeklyUpfRange.ZERO_TO_THREE]: {
      segment: UserSegment.ADVANCED,
      label: '0-3 events per week',
    },
    [WeeklyUpfRange.FOUR_TO_NINE]: {
      segment: UserSegment.INTERMEDIATE,
      label: '4-9 events per week',
    },
    [WeeklyUpfRange.TEN_TO_FOURTEEN]: {
      segment: UserSegment.BEGINNER,
      label: '10-14 events per week',
    },
    [WeeklyUpfRange.FIFTEEN_PLUS]: {
      segment: UserSegment.BEGINNER,
      label: '15+ events per week',
    },
  },
  weeklyReusableOrRefill: {
    [WeeklyReusableRange.ZERO_TO_TWO]: {
      segment: UserSegment.BEGINNER,
      label: '0-2 actions per week',
    },
    [WeeklyReusableRange.THREE_TO_SIX]: {
      segment: UserSegment.INTERMEDIATE,
      label: '3-6 actions per week',
    },
    [WeeklyReusableRange.SEVEN_TO_NINE]: {
      segment: UserSegment.ADVANCED,
      label: '7-9 actions per week',
    },
    [WeeklyReusableRange.TEN_PLUS]: {
      segment: UserSegment.ADVANCED,
      label: '10+ actions per week',
    },
  },
} satisfies Record<string, Record<string, OnboardingBenchmarkBand>>;

export type BenchmarkedOnboardingField = keyof typeof ONBOARDING_SURVEY_BENCHMARKS;
