import { UserSegment, WeeklyBeefFrequency } from '@prisma/client';
import { OnboardingBaselines } from './onboarding.utils';
import {
  BenchmarkedOnboardingField,
  ONBOARDING_SURVEY_BENCHMARKS,
} from './onboarding-survey-benchmarks.config';

/** 0 = most sustainable tier, 2 = least sustainable tier. */
const SEGMENT_RANK: Record<UserSegment, number> = {
  [UserSegment.ADVANCED]: 0,
  [UserSegment.INTERMEDIATE]: 1,
  [UserSegment.BEGINNER]: 2,
};
const RANK_SEGMENT: readonly UserSegment[] = [
  UserSegment.ADVANCED,
  UserSegment.INTERMEDIATE,
  UserSegment.BEGINNER,
];

/**
 * weeklyBeefConsumption has no benchmark table (see
 * onboarding-survey-benchmarks.config.ts), so it keeps the original
 * ordinal-position fallback: the enum's declared order is low -> high
 * severity, spread evenly across the same 0-2 rank scale as the benchmarked
 * categories.
 */
const BEEF_ORDER = Object.values(WeeklyBeefFrequency);
const MAX_BEEF_INDEX = BEEF_ORDER.length - 1;

function benchmarkRank(
  field: BenchmarkedOnboardingField,
  value: string,
): number {
  const band = (
    ONBOARDING_SURVEY_BENCHMARKS[field] as Record<
      string,
      { segment: UserSegment }
    >
  )[value];
  return band ? SEGMENT_RANK[band.segment] : 0;
}

function beefRank(value: WeeklyBeefFrequency): number {
  const index = BEEF_ORDER.indexOf(value);
  if (index === -1) return 0;
  return Math.round((index * 2) / MAX_BEEF_INDEX);
}

/**
 * Average sustainability rank (0 = advanced, 2 = beginner) across all five
 * onboarding baselines: the four benchmarked categories (Figure 9 user
 * segments) plus the beef ordinal fallback.
 */
export function computeAverageRank(baselines: OnboardingBaselines): number {
  const ranks = [
    benchmarkRank('weeklyMeatConsumption', baselines.weeklyMeatConsumption),
    benchmarkRank('weeklyFoodWaste', baselines.weeklyFoodWaste),
    benchmarkRank('weeklyUpfConsumption', baselines.weeklyUpfConsumption),
    benchmarkRank(
      'weeklyReusableOrRefill',
      baselines.weeklyReusableOrRefill,
    ),
    beefRank(baselines.weeklyBeefConsumption),
  ];
  return ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length;
}

/** Rounds the average rank to the nearest tier (ties round up to the middle/worse tier). */
export function rankToSegment(averageRank: number): UserSegment {
  const rounded = Math.min(2, Math.max(0, Math.round(averageRank)));
  return RANK_SEGMENT[rounded];
}

/**
 * Derives the profile/segment a user's onboarding survey answers point to.
 * Used both to persist the segment on submitSurvey() and to keep seed data
 * internally consistent (seeded users' segment matches their baselines
 * instead of being picked independently).
 */
export function deriveUserSegment(
  baselines: OnboardingBaselines,
): UserSegment {
  return rankToSegment(computeAverageRank(baselines));
}
