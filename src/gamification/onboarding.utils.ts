import {
  ProgressIndicatorKind,
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

const DEFAULT_TARGET_BY_SEGMENT: Record<UserSegment, number> = {
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

export const ONBOARDING_BASELINE_FIELDS = [
  'weeklyMeatConsumption',
  'weeklyBeefConsumption',
  'weeklyFoodWaste',
  'weeklyUpfConsumption',
  'weeklyReusableOrRefill',
] as const;

type OnboardingBaselineField = (typeof ONBOARDING_BASELINE_FIELDS)[number];

const ONBOARDING_FIELD_ENUMS: Record<
  OnboardingBaselineField,
  readonly string[]
> = {
  weeklyMeatConsumption: Object.values(WeeklyMeatRange),
  weeklyBeefConsumption: Object.values(WeeklyBeefFrequency),
  weeklyFoodWaste: Object.values(WeeklyFoodWasteRange),
  weeklyUpfConsumption: Object.values(WeeklyUpfRange),
  weeklyReusableOrRefill: Object.values(WeeklyReusableRange),
};

export interface OnboardingBaselines {
  weeklyMeatConsumption: WeeklyMeatRange;
  weeklyBeefConsumption: WeeklyBeefFrequency;
  weeklyFoodWaste: WeeklyFoodWasteRange;
  weeklyUpfConsumption: WeeklyUpfRange;
  weeklyReusableOrRefill: WeeklyReusableRange;
}

type OnboardingSurvey = Partial<Record<OnboardingBaselineField, string>>;

type OnboardingSurveyUser = Partial<
  Record<OnboardingBaselineField, string | null | undefined>
>;

/** Pick known onboardingSurvey fields into column updates; validate enum codes. */
export function extractOnboardingSurvey(survey: unknown): OnboardingSurvey {
  if (survey === null || typeof survey !== 'object' || Array.isArray(survey)) {
    throw new Error('preferences.onboardingSurvey must be an object');
  }

  const obj = survey as Record<string, unknown>;
  const result: OnboardingSurvey = {};
  for (const field of ONBOARDING_BASELINE_FIELDS) {
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

/** True when all five habit baseline columns are set. */
export function hasAllOnboardingBaselines(
  user: OnboardingSurveyUser,
): user is OnboardingBaselines {
  return ONBOARDING_BASELINE_FIELDS.every((field) => user[field] != null);
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
  for (const field of ONBOARDING_BASELINE_FIELDS) {
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
): Omit<T, OnboardingBaselineField> & { preferences: Record<string, unknown> } {
  const preferences = buildUserPreferences(user.preferences, user);
  const formatted = { ...user, preferences } as Omit<
    T,
    OnboardingBaselineField
  > & { preferences: Record<string, unknown> };
  for (const field of ONBOARDING_BASELINE_FIELDS) {
    delete (formatted as Record<string, unknown>)[field];
  }
  return formatted;
}
