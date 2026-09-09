import {
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';
import { OnboardingBaselines } from './onboarding.utils';

/**
 * Ordinal position of every answer (0 = most sustainable, 3 = least), used to
 * score the onboarding survey. The Prisma enums are declared low -> high
 * severity in prisma/models/users.prisma, so `Object.values` already gives
 * that order for four of the five questions. The reusable-containers question
 * is declared low -> high *usage* (more reuse is more sustainable, the
 * opposite polarity), so its severity is inverted in computeImprovementScore.
 */
const MEAT_ORDER = Object.values(WeeklyMeatRange);
const BEEF_ORDER = Object.values(WeeklyBeefFrequency);
const WASTE_ORDER = Object.values(WeeklyFoodWasteRange);
const UPF_ORDER = Object.values(WeeklyUpfRange);
const REUSABLE_ORDER = Object.values(WeeklyReusableRange);

const MAX_ANSWER_INDEX = 3;

function severity(order: readonly string[], value: string): number {
  const index = order.indexOf(value);
  return index === -1 ? 0 : index;
}

/**
 * "Room to improve" score across the five onboarding baselines: 0 (already
 * sustainable across the board) to 15 (worst answer on every question).
 *
 * TODO(onboarding-scoring): first-draft rubric — equal weight per question,
 * ordinal answer position as the only signal. Revisit once product defines
 * real weights/thresholds. Seed-data use only for now (see deriveUserSegment).
 */
export function computeImprovementScore(
  baselines: OnboardingBaselines,
): number {
  return (
    severity(MEAT_ORDER, baselines.weeklyMeatConsumption) +
    severity(BEEF_ORDER, baselines.weeklyBeefConsumption) +
    severity(WASTE_ORDER, baselines.weeklyFoodWaste) +
    severity(UPF_ORDER, baselines.weeklyUpfConsumption) +
    (MAX_ANSWER_INDEX -
      severity(REUSABLE_ORDER, baselines.weeklyReusableOrRefill))
  );
}

/** Score bands over the 0-15 range, split into three roughly equal thirds. */
export function scoreToSegment(score: number): UserSegment {
  if (score <= 4) return UserSegment.ADVANCED;
  if (score <= 9) return UserSegment.INTERMEDIATE;
  return UserSegment.BEGINNER;
}

/**
 * Derives the profile/segment a user's onboarding survey answers point to.
 * Not wired into the live PATCH /users/me flow — segment there stays
 * client-chosen (see GamificationOnboardingService). Used to make seed data
 * internally consistent: seeded users' segment matches their baselines
 * instead of being picked independently.
 */
export function deriveUserSegment(baselines: OnboardingBaselines): UserSegment {
  return scoreToSegment(computeImprovementScore(baselines));
}
