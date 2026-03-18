// Keep in sync with prisma/schema.prisma enums.

export const GENDERS = [
  'MALE',
  'FEMALE',
  'OTHER',
  'UNSPECIFIED',
  'PREFER_NOT_TO_SAY',
] as const;

export const ACTIVITY_LEVELS = [
  'SEDENTARY',
  'LIGHT',
  'MODERATE',
  'ACTIVE',
  'VERY_ACTIVE',
] as const;

export const ANNUAL_INCOME_LEVELS = [
  'BELOW_10000',
  'FROM_10000_TO_19999',
  'FROM_20000_TO_34999',
  'FROM_35000_TO_49999',
  'FROM_50000_TO_74999',
  'FROM_75000_TO_99999',
  'ABOVE_100000',
] as const;

export const EDUCATION_LEVELS = [
  'NO_FORMAL_EDUCATION',
  'PRIMARY',
  'SECONDARY',
  'VOCATIONAL',
  'BACHELORS',
  'MASTERS',
  'DOCTORATE',
] as const;

export const UNITS = ['PIECES', 'G', 'KG', 'ML', 'L', 'CUPS'] as const;

export const TYPE_OF_MEALS = [
  'BREAKFAST',
  'LUNCH',
  'DINNER',
  'SNACK',
  'SPECIAL_DRINKS',
] as const;

export const MEAL_TYPES = ['SALAD', 'MEAT', 'PASTA', 'RICE', 'VEGAN'] as const;

export const GROUP_ROLES = ['ADMIN', 'MEMBER'] as const;
