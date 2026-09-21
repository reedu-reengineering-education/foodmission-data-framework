import { AnnualIncomeLevel } from '@prisma/client';

/**
 * Pilot countries that have an information letter / consent form, as ISO 3166-1
 * alpha-2 lowercase codes. Each entry maps to `consent-forms/<code>.md`, which
 * is generated from the partner .docx files by
 * `npm run docs:consent-forms`.
 */
export const CONSENT_FORM_COUNTRY_CODES = [
  'de',
  'gr',
  'it',
  'nl',
  'no',
  'si',
] as const;

export type ConsentFormCountryCode =
  (typeof CONSENT_FORM_COUNTRY_CODES)[number];

/**
 * EUR band behind each AnnualIncomeLevel code: `min` inclusive, `max`
 * exclusive. Stored answers always mean these EUR bands; a display currency
 * only changes how the bands are labelled.
 */
export const ANNUAL_INCOME_EUR_BANDS: Record<
  AnnualIncomeLevel,
  { min?: number; max?: number }
> = {
  BELOW_10000: { max: 10000 },
  FROM_10000_TO_19999: { min: 10000, max: 20000 },
  FROM_20000_TO_34999: { min: 20000, max: 35000 },
  FROM_35000_TO_49999: { min: 35000, max: 50000 },
  FROM_50000_TO_74999: { min: 50000, max: 75000 },
  FROM_75000_TO_99999: { min: 75000, max: 100000 },
  ABOVE_100000: { min: 100000 },
};

export const DEFAULT_INCOME_CURRENCY = { currency: 'EUR', eurRate: 1 };

/**
 * Countries (ISO 3166-1 alpha-2) whose annual income labels are shown in local
 * currency, converted from the EUR bands at a fixed rate and rounded to two
 * significant figures. Countries not listed are shown in EUR.
 */
export const INCOME_CURRENCY_BY_COUNTRY: Record<
  string,
  { currency: string; eurRate: number }
> = {
  NO: { currency: 'NOK', eurRate: 10.9 },
  PL: { currency: 'PLN', eurRate: 4.3 },
};

/** Country assumed for income labels when a request only carries a locale. */
export const INCOME_COUNTRY_BY_LOCALE: Record<string, string> = {
  no: 'NO',
  pl: 'PL',
};

// Used in the app, then saved in preferences
export const SHOPPING_RESPONSIBILITY_ENTRIES = [
  {
    code: 'NO_SPECIFIC',
    key: 'shoppingResponsibilities.NO_SPECIFIC',
    fallback: 'No specific answer',
  },
  {
    code: 'MOSTLY_ME',
    key: 'shoppingResponsibilities.MOSTLY_ME',
    fallback: 'Mostly me',
  },
  {
    code: 'SHARED_EQUALLY',
    key: 'shoppingResponsibilities.SHARED_EQUALLY',
    fallback: 'Shared equally',
  },
  {
    code: 'MOSTLY_SOMEONE_ELSE',
    key: 'shoppingResponsibilities.MOSTLY_SOMEONE_ELSE',
    fallback: 'Mostly someone else',
  },
  {
    code: 'SOMEONE_ELSE',
    key: 'shoppingResponsibilities.SOMEONE_ELSE',
    fallback: 'Someone else',
  },
] as const;

export const CONTENT_TAG_ENTRIES = [
  {
    code: 'HEALTH',
    key: 'contentTags.HEALTH',
    fallback: 'Health',
  },
  {
    code: 'FOOD_CHOICE',
    key: 'contentTags.FOOD_CHOICE',
    fallback: 'Food choice',
  },
  {
    code: 'FOOD_AND_WASTE',
    key: 'contentTags.FOOD_AND_WASTE',
    fallback: 'Food and waste',
  },
] as const;
