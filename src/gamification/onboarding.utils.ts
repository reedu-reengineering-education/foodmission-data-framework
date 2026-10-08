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

/**
 * Onboarding survey answer columns, in survey order (Q1-Q17). Every
 * question is optional; the answers score each learning dimension's starting
 * level and the overall segment (dimension-levels.config.ts).
 */
export const ONBOARDING_SURVEY_FIELDS = [
  'weeklyMeatConsumption',
  'weeklyBeefConsumption',
  'weeklyLegumeConsumption',
  'checksCountryOfOrigin',
  'choosesSeasonalProduce',
  'considersSustainabilityInfo',
  'readsIngredientLists',
  'sustainabilityLabelFamiliarity',
  'productionMethodsInfluence',
  'weeklyReusableOrRefill',
  'checksPackagingDisposal',
  'weeklyFoodWaste',
  'plansMealsBeforeShopping',
  'usesLeftovers',
  'weeklyUpfConsumption',
  'wholeGrainFrequency',
  'dailyFruitVegServings',
] as const;

export type OnboardingSurveyField = (typeof ONBOARDING_SURVEY_FIELDS)[number];

const HABIT_FREQUENCY_VALUES = Object.values(HabitFrequency);

const ONBOARDING_FIELD_ENUMS: Record<OnboardingSurveyField, readonly string[]> =
  {
    weeklyMeatConsumption: Object.values(WeeklyMeatRange),
    weeklyBeefConsumption: Object.values(WeeklyBeefFrequency),
    weeklyFoodWaste: Object.values(WeeklyFoodWasteRange),
    weeklyUpfConsumption: Object.values(WeeklyUpfRange),
    weeklyReusableOrRefill: Object.values(WeeklyReusableRange),
    weeklyLegumeConsumption: Object.values(WeeklyLegumeFrequency),
    checksCountryOfOrigin: HABIT_FREQUENCY_VALUES,
    choosesSeasonalProduce: HABIT_FREQUENCY_VALUES,
    considersSustainabilityInfo: HABIT_FREQUENCY_VALUES,
    readsIngredientLists: HABIT_FREQUENCY_VALUES,
    sustainabilityLabelFamiliarity: Object.values(LabelFamiliarity),
    productionMethodsInfluence: HABIT_FREQUENCY_VALUES,
    checksPackagingDisposal: HABIT_FREQUENCY_VALUES,
    plansMealsBeforeShopping: HABIT_FREQUENCY_VALUES,
    usesLeftovers: HABIT_FREQUENCY_VALUES,
    wholeGrainFrequency: HABIT_FREQUENCY_VALUES,
    dailyFruitVegServings: Object.values(DailyFruitVegServings),
  };

/** The five weekly habit answers (Q1, Q2, Q10, Q12, Q15). */
export interface OnboardingBaselines {
  weeklyMeatConsumption: WeeklyMeatRange;
  weeklyBeefConsumption: WeeklyBeefFrequency;
  weeklyFoodWaste: WeeklyFoodWasteRange;
  weeklyUpfConsumption: WeeklyUpfRange;
  weeklyReusableOrRefill: WeeklyReusableRange;
}

type OnboardingSurvey = Partial<Record<OnboardingSurveyField, string>>;

export type OnboardingSurveyUser = Partial<
  Record<OnboardingSurveyField, string | null | undefined>
>;

/** Pick known onboardingSurvey fields into column updates; validate enum codes. */
export function extractOnboardingSurvey(survey: unknown): OnboardingSurvey {
  if (survey === null || typeof survey !== 'object' || Array.isArray(survey)) {
    throw new Error('preferences.onboardingSurvey must be an object');
  }

  const obj = survey as Record<string, unknown>;
  const result: OnboardingSurvey = {};
  for (const field of ONBOARDING_SURVEY_FIELDS) {
    if (obj[field] === undefined) continue;
    const value = obj[field];
    if (
      typeof value !== 'string' ||
      !ONBOARDING_FIELD_ENUMS[field].includes(value)
    ) {
      throw new Error(`Invalid value for ${field}`);
    }
    result[field] = value;
  }
  return result;
}

/** Merge stored preferences JSON with onboardingSurvey built from columns. */
export function buildUserPreferences(
  storedPreferences: unknown,
  user: OnboardingSurveyUser,
): Record<string, unknown> {
  const storedPrefs =
    storedPreferences &&
    typeof storedPreferences === 'object' &&
    !Array.isArray(storedPreferences)
      ? (storedPreferences as Record<string, unknown>)
      : {};
  const prefsWithoutSurvey = { ...storedPrefs };
  delete prefsWithoutSurvey.onboardingSurvey;

  const survey: OnboardingSurvey = {};
  for (const field of ONBOARDING_SURVEY_FIELDS) {
    const value = user[field];
    if (value != null) {
      survey[field] = value;
    }
  }

  return {
    ...prefsWithoutSurvey,
    ...(Object.keys(survey).length > 0 ? { onboardingSurvey: survey } : {}),
  };
}

/** Strip onboarding columns and attach normalized preferences for API responses. */
export function formatUserRecordForApi<T extends Record<string, unknown>>(
  user: T,
): Omit<T, OnboardingSurveyField> & { preferences: Record<string, unknown> } {
  const preferences = buildUserPreferences(user.preferences, user);
  const formatted = { ...user, preferences } as Omit<
    T,
    OnboardingSurveyField
  > & { preferences: Record<string, unknown> };
  for (const field of ONBOARDING_SURVEY_FIELDS) {
    delete (formatted as Record<string, unknown>)[field];
  }
  return formatted;
}
