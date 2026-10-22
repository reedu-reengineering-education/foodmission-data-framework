import { BadRequestException } from '@nestjs/common';
import {
  EducationLevel,
  Gender,
  Motivation,
  Prisma,
  UserSegment,
} from '@prisma/client';

/**
 * The one list of user properties an insight can be split by ("breakdowns").
 * Every expression reads the `users` table under the alias `u` and never
 * returns NULL: missing values land in {@link UNKNOWN_BUCKET}.
 *
 * "Breakdown" is the demographic axis; "dimension" always means a learning
 * dimension (FOOD_WASTE, DIET_CHANGES, …).
 */

/** Bucket for users that never filled in the property. */
export const UNKNOWN_BUCKET = 'unknown';

/** Prisma stores DateTime as UTC `timestamp` (no tz), so compare against UTC "now". */
export const NOW_UTC = Prisma.sql`(NOW() AT TIME ZONE 'UTC')`;

export const BREAKDOWN_KEYS = [
  'country',
  'ageGroup',
  'gender',
  'language',
  'segment',
  'motivation',
  'educationLevel',
  'region',
] as const;

export type BreakdownKey = (typeof BREAKDOWN_KEYS)[number];

export interface BreakdownValue {
  value: string;
  label: string;
}

export interface BreakdownDefinition {
  key: BreakdownKey;
  label: string;
  /** Non-null SQL expression over `users u`. */
  sql: Prisma.Sql;
  /** Ordered values for enum-like properties; null for free text. */
  values: BreakdownValue[] | null;
  /** Quasi-identifiers must not be combined with a second breakdown. */
  allowInTwoWay: boolean;
}

export const AGE_GROUPS: BreakdownValue[] = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_24', label: '18–24' },
  { value: '25_34', label: '25–34' },
  { value: '35_44', label: '35–44' },
  { value: '45_54', label: '45–54' },
  { value: '55_64', label: '55–64' },
  { value: '65_plus', label: '65+' },
];

/** Age against the current UTC year. */
const AGE = Prisma.sql`(EXTRACT(YEAR FROM ${NOW_UTC}) - u."yearOfBirth")`;
const AGE_GROUP_SQL = Prisma.sql`
  CASE
    WHEN u."yearOfBirth" IS NULL THEN NULL
    WHEN ${AGE} < 18 THEN 'under_18'
    WHEN ${AGE} < 25 THEN '18_24'
    WHEN ${AGE} < 35 THEN '25_34'
    WHEN ${AGE} < 45 THEN '35_44'
    WHEN ${AGE} < 55 THEN '45_54'
    WHEN ${AGE} < 65 THEN '55_64'
    ELSE '65_plus'
  END`;

/** "PREFER_NOT_TO_SAY" → "Prefer not to say". */
function humanize(value: string): string {
  const words = value.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function enumValues(values: string[]): BreakdownValue[] {
  return [
    ...values.map((value) => ({ value, label: humanize(value) })),
    { value: UNKNOWN_BUCKET, label: 'Unknown' },
  ];
}

function withUnknown(expression: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`COALESCE(${expression}, ${UNKNOWN_BUCKET})`;
}

const MOTIVATION_VALUES = Object.values(Motivation) as string[];

export const BREAKDOWNS: Record<BreakdownKey, BreakdownDefinition> = {
  country: {
    key: 'country',
    label: 'Country',
    // Free text today; normalise so "de", " DE" and "DE" collapse.
    sql: withUnknown(Prisma.sql`UPPER(NULLIF(TRIM(u."country"), ''))`),
    values: null,
    allowInTwoWay: true,
  },
  ageGroup: {
    key: 'ageGroup',
    label: 'Age group',
    sql: withUnknown(AGE_GROUP_SQL),
    values: [...AGE_GROUPS, { value: UNKNOWN_BUCKET, label: 'Unknown' }],
    allowInTwoWay: true,
  },
  gender: {
    key: 'gender',
    label: 'Gender',
    sql: withUnknown(Prisma.sql`u."gender"::text`),
    values: enumValues(Object.values(Gender)),
    allowInTwoWay: true,
  },
  language: {
    key: 'language',
    label: 'Language',
    sql: withUnknown(Prisma.sql`LOWER(NULLIF(TRIM(u."language"), ''))`),
    values: null,
    allowInTwoWay: true,
  },
  segment: {
    key: 'segment',
    label: 'Segment',
    sql: withUnknown(Prisma.sql`u."segment"::text`),
    values: enumValues(Object.values(UserSegment)),
    allowInTwoWay: true,
  },
  motivation: {
    key: 'motivation',
    label: 'Motivation',
    // JSON field written by the app; anything outside the enum counts as unknown.
    sql: withUnknown(
      Prisma.sql`CASE WHEN u."preferences"->>'motivation' IN (${Prisma.join(MOTIVATION_VALUES)})
        THEN u."preferences"->>'motivation' END`,
    ),
    values: enumValues(MOTIVATION_VALUES),
    allowInTwoWay: true,
  },
  educationLevel: {
    key: 'educationLevel',
    label: 'Education level',
    sql: withUnknown(Prisma.sql`u."educationLevel"::text`),
    values: enumValues(Object.values(EducationLevel)),
    allowInTwoWay: true,
  },
  region: {
    key: 'region',
    label: 'Region',
    sql: withUnknown(Prisma.sql`NULLIF(TRIM(u."region"), '')`),
    values: null,
    allowInTwoWay: false,
  },
};

/** Up to two breakdowns, validated. */
export type BreakdownSelection = BreakdownKey[];

export function isBreakdownKey(value: unknown): value is BreakdownKey {
  return (BREAKDOWN_KEYS as readonly unknown[]).includes(value);
}

/**
 * Validates `breakdown` / `breakdown2` query values: known keys, distinct,
 * `breakdown2` only together with `breakdown`, and no quasi-identifier
 * (region) in a two-way split.
 */
export function parseBreakdowns(
  breakdown?: string,
  breakdown2?: string,
): BreakdownSelection {
  const selection: BreakdownKey[] = [];
  for (const [param, value] of [
    ['breakdown', breakdown],
    ['breakdown2', breakdown2],
  ] as const) {
    if (value === undefined || value === '') continue;
    if (!isBreakdownKey(value)) {
      throw new BadRequestException(
        `Invalid ${param} "${value}". Must be one of: ${BREAKDOWN_KEYS.join(', ')}.`,
      );
    }
    selection.push(value);
  }
  if (breakdown2 && !breakdown) {
    throw new BadRequestException('breakdown2 requires breakdown.');
  }
  if (selection.length === 2) {
    if (selection[0] === selection[1]) {
      throw new BadRequestException('breakdown and breakdown2 must differ.');
    }
    const blocked = selection.find((key) => !BREAKDOWNS[key].allowInTwoWay);
    if (blocked) {
      throw new BadRequestException(
        `${blocked} cannot be combined with another breakdown.`,
      );
    }
  }
  return selection;
}

/**
 * SELECT columns `"bd1", "bd2"` for the selection; unused slots are NULL so
 * every insight query can always `GROUP BY "bd1", "bd2"`.
 */
export function breakdownColumns(selection: BreakdownSelection): Prisma.Sql {
  const [first, second] = selection;
  const column = (key: BreakdownKey | undefined) =>
    key ? BREAKDOWNS[key].sql : Prisma.sql`NULL::text`;
  return Prisma.sql`${column(first)} AS "bd1", ${column(second)} AS "bd2"`;
}
