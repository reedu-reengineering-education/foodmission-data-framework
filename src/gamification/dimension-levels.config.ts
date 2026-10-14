import {
  ContentLevel,
  DailyFruitVegServings,
  HabitFrequency,
  LabelFamiliarity,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyLegumeFrequency,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';
import {
  OnboardingSurveyField,
  OnboardingSurveyUser,
} from './onboarding.utils';

/** 0 = beginner behaviour, 1 = intermediate, 2 = advanced. */
type AnswerPoints = 0 | 1 | 2;

/** Never/Rarely 0, Sometimes 1, Often/Always 2: the shared five-step scale. */
const HABIT_POINTS: Record<HabitFrequency, AnswerPoints> = {
  [HabitFrequency.NEVER]: 0,
  [HabitFrequency.RARELY]: 0,
  [HabitFrequency.SOMETIMES]: 1,
  [HabitFrequency.OFTEN]: 2,
  [HabitFrequency.ALWAYS]: 2,
};

/**
 * Points per answer, from the FOODMISSION onboarding survey and user
 * segmentation framework. Q-numbers refer to that document.
 */
export const ONBOARDING_ANSWER_POINTS: Record<
  OnboardingSurveyField,
  Record<string, AnswerPoints>
> = {
  // Q1
  weeklyMeatConsumption: {
    [WeeklyMeatRange.FIFTEEN_PLUS]: 0,
    [WeeklyMeatRange.TEN_TO_FOURTEEN]: 0,
    [WeeklyMeatRange.FIVE_TO_NINE]: 1,
    [WeeklyMeatRange.ZERO_TO_FOUR]: 2,
  },
  // Q2
  weeklyBeefConsumption: {
    [WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK]: 0,
    [WeeklyBeefFrequency.ONE_TO_TWO_TIMES_PER_WEEK]: 1,
    [WeeklyBeefFrequency.LESS_THAN_ONCE_PER_WEEK]: 2,
    [WeeklyBeefFrequency.NEVER]: 2,
  },
  // Q3
  weeklyLegumeConsumption: {
    [WeeklyLegumeFrequency.NEVER]: 0,
    [WeeklyLegumeFrequency.LESS_THAN_ONCE_PER_WEEK]: 0,
    [WeeklyLegumeFrequency.ONCE_PER_WEEK]: 1,
    [WeeklyLegumeFrequency.SEVERAL_TIMES_PER_WEEK]: 2,
    [WeeklyLegumeFrequency.DAILY]: 2,
  },
  // Q4-Q7
  checksCountryOfOrigin: HABIT_POINTS,
  choosesSeasonalProduce: HABIT_POINTS,
  considersSustainabilityInfo: HABIT_POINTS,
  readsIngredientLists: HABIT_POINTS,
  // Q8
  sustainabilityLabelFamiliarity: {
    [LabelFamiliarity.NOT_FAMILIAR]: 0,
    [LabelFamiliarity.SLIGHTLY_FAMILIAR]: 0,
    [LabelFamiliarity.MODERATELY_FAMILIAR]: 1,
    [LabelFamiliarity.FAMILIAR]: 2,
    [LabelFamiliarity.VERY_FAMILIAR]: 2,
  },
  // Q9
  productionMethodsInfluence: HABIT_POINTS,
  // Q10
  weeklyReusableOrRefill: {
    [WeeklyReusableRange.ZERO_TO_TWO]: 0,
    [WeeklyReusableRange.THREE_TO_SIX]: 1,
    [WeeklyReusableRange.SEVEN_TO_NINE]: 2,
    [WeeklyReusableRange.TEN_PLUS]: 2,
  },
  // Q11
  checksPackagingDisposal: HABIT_POINTS,
  // Q12
  weeklyFoodWaste: {
    [WeeklyFoodWasteRange.FIVE_PLUS]: 0,
    [WeeklyFoodWasteRange.THREE_TO_FOUR]: 1,
    [WeeklyFoodWasteRange.ONE_TO_TWO]: 2,
    [WeeklyFoodWasteRange.ZERO]: 2,
  },
  // Q13-Q14
  plansMealsBeforeShopping: HABIT_POINTS,
  usesLeftovers: HABIT_POINTS,
  // Q15
  weeklyUpfConsumption: {
    [WeeklyUpfRange.FIFTEEN_PLUS]: 0,
    [WeeklyUpfRange.TEN_TO_FOURTEEN]: 0,
    [WeeklyUpfRange.FOUR_TO_NINE]: 1,
    [WeeklyUpfRange.ZERO_TO_THREE]: 2,
  },
  // Q16
  wholeGrainFrequency: HABIT_POINTS,
  // Q17
  dailyFruitVegServings: {
    [DailyFruitVegServings.LESS_THAN_ONE]: 0,
    [DailyFruitVegServings.ONE_TO_TWO]: 1,
    [DailyFruitVegServings.THREE_TO_FOUR]: 1,
    [DailyFruitVegServings.FIVE_PLUS]: 2,
  },
};

export interface DimensionScoring {
  fields: readonly OnboardingSurveyField[];
  /** Highest total that is still BEGINNER. */
  beginnerMax: number;
  /** Highest total that is still INTERMEDIATE; anything above is ADVANCED. */
  intermediateMax: number;
}

/**
 * Which questions add up to each learning dimension's score, and the
 * segmentation bands from the survey framework (3 questions: 0-2 / 3-4 /
 * 5-6, packaging with 2 questions: 0-1 / 2-3 / 4).
 */
export const DIMENSION_SCORING: Record<string, DimensionScoring> = {
  DIET_CHANGES: {
    fields: [
      'weeklyMeatConsumption',
      'weeklyBeefConsumption',
      'weeklyLegumeConsumption',
    ],
    beginnerMax: 2,
    intermediateMax: 4,
  },
  PRODUCT_CHOICES: {
    fields: [
      'checksCountryOfOrigin',
      'choosesSeasonalProduce',
      'considersSustainabilityInfo',
    ],
    beginnerMax: 2,
    intermediateMax: 4,
  },
  PRODUCTION_METHODS: {
    fields: [
      'readsIngredientLists',
      'sustainabilityLabelFamiliarity',
      'productionMethodsInfluence',
    ],
    beginnerMax: 2,
    intermediateMax: 4,
  },
  PACKAGING: {
    fields: ['weeklyReusableOrRefill', 'checksPackagingDisposal'],
    beginnerMax: 1,
    intermediateMax: 3,
  },
  FOOD_WASTE: {
    fields: ['weeklyFoodWaste', 'plansMealsBeforeShopping', 'usesLeftovers'],
    beginnerMax: 2,
    intermediateMax: 4,
  },
  NUTRITION_VALUES: {
    fields: [
      'weeklyUpfConsumption',
      'wholeGrainFrequency',
      'dailyFruitVegServings',
    ],
    beginnerMax: 2,
    intermediateMax: 4,
  },
};

const NEXT_LEVEL: Record<ContentLevel, ContentLevel | null> = {
  [ContentLevel.BEGINNER]: ContentLevel.INTERMEDIATE,
  [ContentLevel.INTERMEDIATE]: ContentLevel.ADVANCED,
  [ContentLevel.ADVANCED]: null,
};

export function nextLevel(level: ContentLevel): ContentLevel | null {
  return NEXT_LEVEL[level];
}

/**
 * Starting level for one dimension: the sum of its answers' points mapped
 * through the survey framework's bands. Every question is optional and a
 * skipped one scores 0, so a dimension with nothing answered starts as BEGINNER
 * (as does a dimension without scoring).
 */
export function inferDimensionLevel(
  dimensionCode: string,
  answers: OnboardingSurveyUser,
): ContentLevel {
  const scoring = DIMENSION_SCORING[dimensionCode];
  if (!scoring) return ContentLevel.BEGINNER;

  let total = 0;
  for (const field of scoring.fields) {
    const value = answers[field];
    total += (value && ONBOARDING_ANSWER_POINTS[field][value]) || 0;
  }
  if (total <= scoring.beginnerMax) return ContentLevel.BEGINNER;
  if (total <= scoring.intermediateMax) return ContentLevel.INTERMEDIATE;
  return ContentLevel.ADVANCED;
}
