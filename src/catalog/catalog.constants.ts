import { AnnualIncomeLevel } from '@prisma/client';

/** Every pilot country has an English form; other languages fall back to it. */
export const CONSENT_FORM_FALLBACK_LANGUAGE = 'en';

/**
 * Pilot countries that have an information letter / consent form (ISO 3166-1
 * alpha-2, lowercase), with the languages each form exists in (app locales,
 * see `SUPPORTED_LOCALES`). Each pair maps to
 * `consent-forms/<country>.<language>.md`, which is generated from the partner
 * .docx files by `npm run docs:consent-forms`.
 */
export const CONSENT_FORM_LANGUAGES = {
  de: ['en', 'de'],
  gr: ['en', 'el'],
  it: ['en', 'it'],
  nl: ['en', 'nl'],
  no: ['en', 'no'],
  // No updated CCIS-CAFE form yet: still the earlier English-only version.
  si: ['en'],
} as const satisfies Record<string, readonly string[]>;

export type ConsentFormCountryCode = keyof typeof CONSENT_FORM_LANGUAGES;

export const CONSENT_FORM_COUNTRY_CODES = Object.keys(
  CONSENT_FORM_LANGUAGES,
) as ConsentFormCountryCode[];

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
    code: 'FOOD_WASTE',
    key: 'contentTags.FOOD_WASTE',
    fallback: 'Food waste',
  },
] as const;

/**
 * Region lists that replace the bundled iso-3166-2 data, which is outdated for
 * these countries: Norway still has its pre-2020 counties, Italy mixes its 20
 * regions with the provinces below them, and Greece mixes its 13 regions with
 * the prefectures abolished in 2011. Codes and names follow current ISO 3166-2.
 */
export const REGION_OVERRIDES: Record<
  string,
  readonly { code: string; name: string }[]
> = {
  // 15 counties since the 2024 reform, plus the two arctic territories.
  NO: [
    { code: 'NO-03', name: 'Oslo' },
    { code: 'NO-11', name: 'Rogaland' },
    { code: 'NO-15', name: 'Møre og Romsdal' },
    { code: 'NO-18', name: 'Nordland' },
    { code: 'NO-31', name: 'Østfold' },
    { code: 'NO-32', name: 'Akershus' },
    { code: 'NO-33', name: 'Buskerud' },
    { code: 'NO-34', name: 'Innlandet' },
    { code: 'NO-39', name: 'Vestfold' },
    { code: 'NO-40', name: 'Telemark' },
    { code: 'NO-42', name: 'Agder' },
    { code: 'NO-46', name: 'Vestland' },
    { code: 'NO-50', name: 'Trøndelag' },
    { code: 'NO-55', name: 'Troms' },
    { code: 'NO-56', name: 'Finnmark' },
    { code: 'NO-21', name: 'Svalbard' },
    { code: 'NO-22', name: 'Jan Mayen' },
  ],
  IT: [
    { code: 'IT-21', name: 'Piemonte' },
    { code: 'IT-23', name: "Valle d'Aosta" },
    { code: 'IT-25', name: 'Lombardia' },
    { code: 'IT-32', name: 'Trentino-Alto Adige' },
    { code: 'IT-34', name: 'Veneto' },
    { code: 'IT-36', name: 'Friuli-Venezia Giulia' },
    { code: 'IT-42', name: 'Liguria' },
    { code: 'IT-45', name: 'Emilia-Romagna' },
    { code: 'IT-52', name: 'Toscana' },
    { code: 'IT-55', name: 'Umbria' },
    { code: 'IT-57', name: 'Marche' },
    { code: 'IT-62', name: 'Lazio' },
    { code: 'IT-65', name: 'Abruzzo' },
    { code: 'IT-67', name: 'Molise' },
    { code: 'IT-72', name: 'Campania' },
    { code: 'IT-75', name: 'Puglia' },
    { code: 'IT-77', name: 'Basilicata' },
    { code: 'IT-78', name: 'Calabria' },
    { code: 'IT-82', name: 'Sicilia' },
    { code: 'IT-88', name: 'Sardegna' },
  ],
  // 13 regions plus the self-governed Mount Athos.
  GR: [
    { code: 'GR-A', name: 'Anatolikí Makedonía kai Thráki' },
    { code: 'GR-B', name: 'Kentrikí Makedonía' },
    { code: 'GR-C', name: 'Dytikí Makedonía' },
    { code: 'GR-D', name: 'Ípeiros' },
    { code: 'GR-E', name: 'Thessalía' },
    { code: 'GR-F', name: 'Ionía Nísia' },
    { code: 'GR-G', name: 'Dytikí Elláda' },
    { code: 'GR-H', name: 'Stereá Elláda' },
    { code: 'GR-I', name: 'Attikí' },
    { code: 'GR-J', name: 'Pelopónnisos' },
    { code: 'GR-K', name: 'Vóreio Aigaío' },
    { code: 'GR-L', name: 'Nótio Aigaío' },
    { code: 'GR-M', name: 'Kríti' },
    { code: 'GR-69', name: 'Ágion Óros' },
  ],
};
