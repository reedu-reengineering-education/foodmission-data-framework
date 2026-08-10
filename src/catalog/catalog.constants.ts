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
