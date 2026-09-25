import {
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';
import { OnboardingBaselineField } from './onboarding.utils';

export interface OnboardingSurveyOption {
  value: string;
  label: string;
}

export interface OnboardingSurveyQuestion {
  /** Matches the `preferences.onboardingSurvey` key this question answers. */
  field: OnboardingBaselineField;
  text: string;
  options: OnboardingSurveyOption[];
}

/**
 * The 5-question onboarding survey used to seed the sustainability progress
 * wheels. Static content — not stored in the generic Survey/Question tables
 * (those are Likert-only, built for the FOODMISSION research surveys).
 *
 * Option labels are normalized to the enum boundaries (e.g. "10-14" not
 * "10-15") so ranges don't overlap with the next option.
 */
export const ONBOARDING_SURVEY_QUESTIONS: readonly OnboardingSurveyQuestion[] =
  [
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
  ];
