import {
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
import { OnboardingSurveyField } from './onboarding.utils';

export interface OnboardingSurveyOption {
  value: string;
  label: string;
}

export interface OnboardingSurveyQuestion {
  /** Matches the `preferences.onboardingSurvey` key this question answers. */
  field: OnboardingSurveyField;
  text: string;
  options: OnboardingSurveyOption[];
}

/** Labels for the shared five-step HabitFrequency scale, top step varies. */
function habitOptions(
  labels: [string, string, string, string, string] = [
    'Never',
    'Rarely',
    'Sometimes',
    'Often',
    'Nearly always',
  ],
): OnboardingSurveyOption[] {
  return Object.values(HabitFrequency).map((value, i) => ({
    value,
    label: labels[i],
  }));
}

/**
 * The 17-question onboarding survey (FOODMISSION onboarding survey and user
 * segmentation framework), grouped by learning dimension in document order.
 * Every question is optional; the answers score the per-dimension starting
 * levels and, from those, the overall segment (see dimension-levels.config.ts). Static content — not stored in the generic
 * Survey/Question tables (those are Likert-only, built for the FOODMISSION
 * research surveys).
 *
 * Option labels are normalized to the enum boundaries (e.g. "10-14" not
 * "10-15") so ranges don't overlap with the next option.
 */
export const ONBOARDING_SURVEY_QUESTIONS: readonly OnboardingSurveyQuestion[] =
  [
    // Diet changes
    {
      field: 'weeklyMeatConsumption',
      text: 'How many meals containing meat do you typically eat each week?',
      options: [
        { value: WeeklyMeatRange.ZERO_TO_FOUR, label: '0-4 meals per week' },
        { value: WeeklyMeatRange.FIVE_TO_NINE, label: '5-9 meals per week' },
        {
          value: WeeklyMeatRange.TEN_TO_FOURTEEN,
          label: '10-14 meals per week',
        },
        { value: WeeklyMeatRange.FIFTEEN_PLUS, label: '15+ meals per week' },
      ],
    },
    {
      field: 'weeklyBeefConsumption',
      text: 'How often do you consume beef?',
      options: [
        { value: WeeklyBeefFrequency.NEVER, label: 'Never' },
        {
          value: WeeklyBeefFrequency.LESS_THAN_ONCE_PER_WEEK,
          label: 'Less than once per week',
        },
        {
          value: WeeklyBeefFrequency.ONE_TO_TWO_TIMES_PER_WEEK,
          label: '1-2 times per week',
        },
        {
          value: WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK,
          label: '3+ times per week',
        },
      ],
    },
    {
      field: 'weeklyLegumeConsumption',
      text: 'How often do you eat legumes (beans, lentils, chickpeas, peas)?',
      options: [
        { value: WeeklyLegumeFrequency.NEVER, label: 'Never' },
        {
          value: WeeklyLegumeFrequency.LESS_THAN_ONCE_PER_WEEK,
          label: 'Less than once per week',
        },
        { value: WeeklyLegumeFrequency.ONCE_PER_WEEK, label: 'Once per week' },
        {
          value: WeeklyLegumeFrequency.SEVERAL_TIMES_PER_WEEK,
          label: 'Several times per week',
        },
        { value: WeeklyLegumeFrequency.DAILY, label: 'Daily' },
      ],
    },
    // Product choices considering environmental impact
    {
      field: 'checksCountryOfOrigin',
      text: 'How often do you check the country of origin of food products?',
      options: habitOptions([
        'Never',
        'Rarely',
        'Sometimes',
        'Often',
        'Almost always',
      ]),
    },
    {
      field: 'choosesSeasonalProduce',
      text: 'How often do you intentionally choose seasonal fruit and vegetables?',
      options: habitOptions([
        'Never',
        'Occasionally',
        'About half the time',
        'Often',
        'Nearly always',
      ]),
    },
    {
      field: 'considersSustainabilityInfo',
      text: 'How often do you consider environmental or sustainability information before purchasing food?',
      options: habitOptions(),
    },
    // Production methods
    {
      field: 'readsIngredientLists',
      text: 'How often do you read ingredient lists before purchasing packaged foods?',
      options: habitOptions(),
    },
    {
      field: 'sustainabilityLabelFamiliarity',
      text: 'How familiar are you with sustainability-related labels and claims?',
      options: [
        { value: LabelFamiliarity.NOT_FAMILIAR, label: 'Not familiar' },
        {
          value: LabelFamiliarity.SLIGHTLY_FAMILIAR,
          label: 'Slightly familiar',
        },
        {
          value: LabelFamiliarity.MODERATELY_FAMILIAR,
          label: 'Moderately familiar',
        },
        { value: LabelFamiliarity.FAMILIAR, label: 'Familiar' },
        { value: LabelFamiliarity.VERY_FAMILIAR, label: 'Very familiar' },
      ],
    },
    {
      field: 'productionMethodsInfluence',
      text: 'How often do production methods influence your purchasing decisions?',
      options: habitOptions(),
    },
    // Packaging
    {
      field: 'weeklyReusableOrRefill',
      text: 'How often do you use reusable containers or purchase refill products?',
      options: [
        {
          value: WeeklyReusableRange.ZERO_TO_TWO,
          label: '0-2 actions per week',
        },
        {
          value: WeeklyReusableRange.THREE_TO_SIX,
          label: '3-6 actions per week',
        },
        {
          value: WeeklyReusableRange.SEVEN_TO_NINE,
          label: '7-9 actions per week',
        },
        {
          value: WeeklyReusableRange.TEN_PLUS,
          label: '10+ actions per week',
        },
      ],
    },
    {
      field: 'checksPackagingDisposal',
      text: 'How often do you check recycling/reuse/disposal instructions on packaging?',
      options: habitOptions(),
    },
    // Food waste
    {
      field: 'weeklyFoodWaste',
      text: 'How often do you throw away edible food?',
      options: [
        { value: WeeklyFoodWasteRange.ZERO, label: 'Never' },
        {
          value: WeeklyFoodWasteRange.ONE_TO_TWO,
          label: '1-2 times per week',
        },
        {
          value: WeeklyFoodWasteRange.THREE_TO_FOUR,
          label: '3-4 times per week',
        },
        {
          value: WeeklyFoodWasteRange.FIVE_PLUS,
          label: '5+ times per week',
        },
      ],
    },
    {
      field: 'plansMealsBeforeShopping',
      text: 'How often do you plan meals before shopping?',
      options: habitOptions([
        'Never',
        'Rarely',
        'Sometimes',
        'Often',
        'Always',
      ]),
    },
    {
      field: 'usesLeftovers',
      text: 'How often do you deliberately use leftovers for another meal?',
      options: habitOptions([
        'Never',
        'Rarely',
        'Sometimes',
        'Often',
        'Always',
      ]),
    },
    // Nutrition values
    {
      field: 'weeklyUpfConsumption',
      text: 'How often do you consume ultra-processed foods such as packaged snacks, sugary drinks, ready meals, or processed meat products?',
      options: [
        {
          value: WeeklyUpfRange.ZERO_TO_THREE,
          label: '0-3 times per week',
        },
        { value: WeeklyUpfRange.FOUR_TO_NINE, label: '4-9 times per week' },
        {
          value: WeeklyUpfRange.TEN_TO_FOURTEEN,
          label: '10-14 times per week',
        },
        { value: WeeklyUpfRange.FIFTEEN_PLUS, label: '15+ times per week' },
      ],
    },
    {
      field: 'wholeGrainFrequency',
      text: 'How often do you choose whole-grain foods?',
      options: habitOptions(['Never', 'Rarely', 'Sometimes', 'Often', 'Daily']),
    },
    {
      field: 'dailyFruitVegServings',
      text: 'How many servings of fruit and vegetables do you usually consume each day?',
      options: [
        {
          value: DailyFruitVegServings.LESS_THAN_ONE,
          label: 'Less than 1 serving per day',
        },
        {
          value: DailyFruitVegServings.ONE_TO_TWO,
          label: '1-2 servings per day',
        },
        {
          value: DailyFruitVegServings.THREE_TO_FOUR,
          label: '3-4 servings per day',
        },
        {
          value: DailyFruitVegServings.FIVE_PLUS,
          label: '5+ servings per day',
        },
      ],
    },
  ];
