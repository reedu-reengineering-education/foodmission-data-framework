export const DEFAULT_LOCALE = 'en';

export const SUPPORTED_LOCALES = [
  'en',
  'no',
  'de',
  'el',
  'es',
  'it',
  'nl',
  'pl',
  'sl',
] as const;

/** Locales handed off to external translators (all supported except base English). */
export const TRANSLATION_TARGET_LOCALES = SUPPORTED_LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE,
);
