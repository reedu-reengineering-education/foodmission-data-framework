import { ContentLevel, UserSegment } from '@prisma/client';
import { answerSegment } from './onboarding-scoring';
import {
  ONBOARDING_BASELINE_FIELDS,
  OnboardingBaselineField,
} from './onboarding.utils';

/**
 * Which learning dimension each onboarding answer sets the starting level
 * for. PLACEHOLDER until the project's survey -> dimension mapping document
 * lands; swap the entries here, nothing else depends on the pairing.
 *
 * A dimension with no question here (PRODUCTION_METHODS today) starts at the
 * user's overall segment, the average across all five answers.
 */
export const ONBOARDING_FIELD_DIMENSION: Record<
  OnboardingBaselineField,
  string
> = {
  weeklyMeatConsumption: 'DIET_CHANGES',
  weeklyBeefConsumption: 'PRODUCT_CHOICES',
  weeklyFoodWaste: 'FOOD_WASTE',
  weeklyUpfConsumption: 'NUTRITION_VALUES',
  weeklyReusableOrRefill: 'PACKAGING',
};

const NEXT_LEVEL: Record<ContentLevel, ContentLevel | null> = {
  [ContentLevel.BEGINNER]: ContentLevel.INTERMEDIATE,
  [ContentLevel.INTERMEDIATE]: ContentLevel.ADVANCED,
  [ContentLevel.ADVANCED]: null,
};

export function nextLevel(level: ContentLevel): ContentLevel | null {
  return NEXT_LEVEL[level];
}

type OnboardingAnswers = Partial<
  Record<OnboardingBaselineField, string | null | undefined>
>;

/**
 * Starting level for one dimension: the tier its mapped onboarding answer
 * points to, else the overall segment. ContentLevel and UserSegment share
 * their values (BEGINNER / INTERMEDIATE / ADVANCED).
 */
export function inferDimensionLevel(
  dimensionCode: string,
  answers: OnboardingAnswers,
  segment: UserSegment,
): ContentLevel {
  const field = ONBOARDING_BASELINE_FIELDS.find(
    (f) => ONBOARDING_FIELD_DIMENSION[f] === dimensionCode,
  );
  const value = field ? answers[field] : null;
  return field && value ? answerSegment(field, value) : segment;
}
