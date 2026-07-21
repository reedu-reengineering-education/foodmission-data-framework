import {
  ProgressIndicatorKind,
  ProgressPrecision,
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';

/** Soft progress indicator kinds seeded at onboarding (Gamification.md §12). */
export const SOFT_PROGRESS_INDICATOR_KINDS: ProgressIndicatorKind[] = [
  ProgressIndicatorKind.FOOD_CHOICES,
  ProgressIndicatorKind.FOOD_AND_WASTE,
  ProgressIndicatorKind.HEALTH,
  ProgressIndicatorKind.CO2_REDUCTION,
  ProgressIndicatorKind.ENERGY_REDUCTION,
  ProgressIndicatorKind.WATER_SAVINGS,
  ProgressIndicatorKind.LAND_USE_REDUCTION,
];

export const DEFAULT_TARGET_BY_SEGMENT: Record<UserSegment, number> = {
  [UserSegment.BEGINNER]: 10,
  [UserSegment.INTERMEDIATE]: 20,
  [UserSegment.ADVANCED]: 30,
};

export function targetForSegment(
  segment: UserSegment | null | undefined,
): number {
  if (!segment) return DEFAULT_TARGET_BY_SEGMENT[UserSegment.BEGINNER];
  return DEFAULT_TARGET_BY_SEGMENT[segment];
}

export interface OnboardingBaselines {
  weeklyMeatConsumption: WeeklyMeatRange;
  weeklyBeefConsumption: WeeklyBeefFrequency;
  weeklyFoodWaste: WeeklyFoodWasteRange;
  weeklyUpfConsumption: WeeklyUpfRange;
  weeklyReusableOrRefill: WeeklyReusableRange;
}

/**
 * Higher score = less sustainable habits → BEGINNER.
 * Reusable usage is inverted (more reuse → lower score).
 */
export function deriveUserSegment(baselines: OnboardingBaselines): UserSegment {
  const meatScore: Record<WeeklyMeatRange, number> = {
    [WeeklyMeatRange.ZERO_TO_FOUR]: 0,
    [WeeklyMeatRange.FIVE_TO_NINE]: 1,
    [WeeklyMeatRange.TEN_TO_FOURTEEN]: 2,
    [WeeklyMeatRange.FIFTEEN_PLUS]: 3,
  };
  const beefScore: Record<WeeklyBeefFrequency, number> = {
    [WeeklyBeefFrequency.NEVER]: 0,
    [WeeklyBeefFrequency.LESS_THAN_ONCE_PER_WEEK]: 1,
    [WeeklyBeefFrequency.ONE_TO_TWO_TIMES_PER_WEEK]: 2,
    [WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK]: 3,
  };
  const wasteScore: Record<WeeklyFoodWasteRange, number> = {
    [WeeklyFoodWasteRange.ZERO]: 0,
    [WeeklyFoodWasteRange.ONE_TO_TWO]: 1,
    [WeeklyFoodWasteRange.THREE_TO_FOUR]: 2,
    [WeeklyFoodWasteRange.FIVE_PLUS]: 3,
  };
  const upfScore: Record<WeeklyUpfRange, number> = {
    [WeeklyUpfRange.ZERO_TO_THREE]: 0,
    [WeeklyUpfRange.FOUR_TO_NINE]: 1,
    [WeeklyUpfRange.TEN_TO_FOURTEEN]: 2,
    [WeeklyUpfRange.FIFTEEN_PLUS]: 3,
  };
  const reusableScore: Record<WeeklyReusableRange, number> = {
    [WeeklyReusableRange.TEN_PLUS]: 0,
    [WeeklyReusableRange.SEVEN_TO_NINE]: 1,
    [WeeklyReusableRange.THREE_TO_SIX]: 2,
    [WeeklyReusableRange.ZERO_TO_TWO]: 3,
  };

  const total =
    meatScore[baselines.weeklyMeatConsumption] +
    beefScore[baselines.weeklyBeefConsumption] +
    wasteScore[baselines.weeklyFoodWaste] +
    upfScore[baselines.weeklyUpfConsumption] +
    reusableScore[baselines.weeklyReusableOrRefill];

  const average = total / 5;
  if (average >= 2) return UserSegment.BEGINNER;
  if (average >= 1) return UserSegment.INTERMEDIATE;
  return UserSegment.ADVANCED;
}

export { ProgressPrecision };
