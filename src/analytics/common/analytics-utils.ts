import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Unified DTOs for analytics API responses.
export interface AnalyticsNutritionDto {
  id: string;
  date: Date;
  typeOfMeal?: string;
  userCount: number;
  entityCount?: number;
  mealCount?: number;
  avgCalories?: number;
  avgProteins?: number;
  avgFat?: number;
  avgCarbs?: number;
  avgFiber?: number;
  avgSodium?: number;
  avgSugar?: number;
  avgSaturatedFat?: number;
  p25Calories?: number;
  p50Calories?: number;
  p75Calories?: number;
  metadata?: {
    valueUnit: string;
    entityUnit: string;
  };
}

export interface AnalyticsFoodPopularityDto {
  id: string;
  date: Date;
  itemName: string;
  itemGroup?: string;
  foodName: string;
  foodGroup?: string;
  itemType?: string;
  frequency: number;
  uniqueUsers?: number;
  avgQuantity?: number;
  predominantUnit?: string;
}

/**
 * Shared demographic dimension constants used across analytics aggregators,
 * repositories, services, and controllers.
 */
export const DEMOGRAPHIC_DIMENSIONS = [
  'ageGroup',
  'country',
  'educationLevel',
  'gender',
  'region',
] as const;

export type DemographicDimension = (typeof DEMOGRAPHIC_DIMENSIONS)[number];

/**
 * Enum-like object for use with NestJS ParseEnumPipe.
 * ParseEnumPipe requires an object, so derive one from DEMOGRAPHIC_DIMENSIONS.
 */
export const DemographicDimensionEnum = Object.fromEntries(
  DEMOGRAPHIC_DIMENSIONS.map((d) => [d, d]),
) as Record<DemographicDimension, DemographicDimension>;

/**
 * Returns the arithmetic mean of a non-empty number array, or null when empty.
 * Shared across all analytics services.
 */
export function safeAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * k-anonymity threshold: suppress single-dimension groups with fewer than K
 * unique users to prevent re-identification.
 */
export const K_ANONYMITY_THRESHOLD = 5;

/**
 * Stricter k-anonymity threshold for cross-dimensional groups (two dimensions
 * combined). Higher threshold because intersecting dimensions creates smaller,
 * more identifiable cohorts.
 */
export const K_ANONYMITY_CROSS_DIM_THRESHOLD = 20;

/**
 * Parses and validates a `limit` query-string parameter.
 * Accepts only pure digit strings; rejects partial parses like "5xyz" or "3.5".
 * Throws BadRequestException for invalid input.
 */
export function parseLimit(
  value: string | undefined,
  defaultLimit = 20,
): number {
  if (value === undefined || value === '') return defaultLimit;
  if (!/^\d+$/.test(value)) {
    throw new BadRequestException(
      `Invalid limit "${value}". Must be an integer between 1 and 100.`,
    );
  }
  const parsed = parseInt(value, 10);
  if (parsed < 1 || parsed > 100) {
    throw new BadRequestException(
      `Invalid limit "${value}". Must be an integer between 1 and 100.`,
    );
  }
  return parsed;
}

/**
 * Parses and validates a date query-string parameter.
 * Returns undefined for absent/empty values.
 * Throws BadRequestException for strings that don't produce a valid Date.
 */
export function parseDate(
  value: string | undefined,
  param: string,
): Date | undefined {
  if (value === undefined || value === '') return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new BadRequestException(
      `Invalid date "${value}" for ${param}. Expected ISO 8601 format (e.g. 2026-01-01).`,
    );
  }
  return d;
}

/**
 * Normalizes a cross-dimensional filter pair so that dim1 ≤ dim2
 * alphabetically, matching the storage convention used at aggregation time.
 * When both dimensions are provided in the wrong order the pair is swapped
 * silently; the caller receives correct results regardless of client ordering.
 */
export function normalizeDimPair<T extends string>(
  dim1: T | undefined,
  dim2: T | undefined,
): [T | undefined, T | undefined] {
  if (dim1 && dim2 && dim1 > dim2) return [dim2, dim1];
  return [dim1, dim2];
}

/**
 * Returns the p-th percentile of a numeric array using linear interpolation.
 * Returns null for empty arrays.
 */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

/**
 * Returns the sample standard deviation of a numeric array.
 * Returns null for arrays with fewer than 2 elements.
 */
export function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = safeAvg(values)!;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(
    squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1),
  );
}

/**
 * Returns the most frequent string value in an array.
 * Returns null for empty arrays.
 */
export function mode(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Returns a frequency map of string values in an array.
 * Returns null for empty arrays (distinguishes "no data" from an empty distribution).
 */
export function distribution(values: string[]): Record<string, number> | null {
  if (values.length === 0) return null;
  const dist: Record<string, number> = {};
  for (const v of values) dist[v] = (dist[v] ?? 0) + 1;
  return dist;
}

/**
 * A food item frequency row shared between shopping-list and meal-log analytics.
 * Represents how often a specific food appears across user activity in a given period.
 */
export interface FoodFrequencyRow {
  date: Date;
  foodName: string;
  foodGroup: string | null;
  itemType: string;
  frequency: number;
  uniqueUsers: number;
  avgQuantity: number;
  predominantUnit: string;
}

// ============================================================
// Age-group SQL fragment
// ============================================================

/**
 * Prisma SQL fragment that maps u."yearOfBirth" to a standardised age-group
 * bucket. Ready to be interpolated into any Prisma $queryRaw template.
 * Produces a text value or NULL when yearOfBirth is not set.
 */
export const AGE_GROUP_SQL: Prisma.Sql = Prisma.sql`
  CASE
    WHEN u."yearOfBirth" IS NULL THEN NULL
    WHEN (EXTRACT(YEAR FROM NOW()) - u."yearOfBirth") < 18 THEN 'under_18'
    WHEN (EXTRACT(YEAR FROM NOW()) - u."yearOfBirth") < 25 THEN '18_24'
    WHEN (EXTRACT(YEAR FROM NOW()) - u."yearOfBirth") < 35 THEN '25_34'
    WHEN (EXTRACT(YEAR FROM NOW()) - u."yearOfBirth") < 45 THEN '35_44'
    WHEN (EXTRACT(YEAR FROM NOW()) - u."yearOfBirth") < 55 THEN '45_54'
    WHEN (EXTRACT(YEAR FROM NOW()) - u."yearOfBirth") < 65 THEN '55_64'
    ELSE '65_plus'
  END`;

// ============================================================
// k-anonymity filter
// ============================================================

/**
 * Filters rows whose user-count field is below the given threshold.
 * Returns both the filtered rows and the number of suppressed groups so
 * callers can accumulate a total suppression count.
 *
 * @param rows     Rows to filter.
 * @param field    Which field holds the user count. Defaults to 'userCount'.
 * @param threshold Minimum count required to keep a row. Defaults to K_ANONYMITY_THRESHOLD.
 */
export function applyKAnonymity<
  T extends { userCount?: number; uniqueUsers?: number },
>(
  rows: T[],
  field: 'userCount' | 'uniqueUsers' = 'userCount',
  threshold = K_ANONYMITY_THRESHOLD,
): { rows: T[]; suppressed: number } {
  let suppressed = 0;
  const filtered = rows.filter((r) => {
    const count = r[field] as number;
    if (count < threshold) {
      suppressed++;
      return false;
    }
    return true;
  });
  return { rows: filtered, suppressed };
}

export interface SuppressedCounter {
  value: number;
}

export function makeApplyK(counter: SuppressedCounter) {
  return <T extends { userCount?: number; uniqueUsers?: number }>(
    rows: T[],
    field: 'userCount' | 'uniqueUsers' = 'userCount',
    threshold = K_ANONYMITY_THRESHOLD,
  ): T[] => {
    const { rows: filtered, suppressed } = applyKAnonymity(rows, field, threshold);
    counter.value += suppressed;
    return filtered;
  };
}

export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }
  return map;
}

export function buildCrossDimPairs<T extends string>(
  dimensions: readonly T[],
): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < dimensions.length; i++) {
    for (let j = i + 1; j < dimensions.length; j++) {
      const a = dimensions[i];
      const b = dimensions[j];
      pairs.push(a < b ? [a, b] : [b, a]);
    }
  }
  return pairs;
}

// ============================================================
// Food frequency aggregation helper
// ============================================================

/**
 * Aggregates a flat list of food-item observations into FoodFrequencyRow[].
 * Shared by meal-log (aggregateFoodPopularity) and shopping-list
 * (aggregateItemPopularity) — both produce the same FoodFrequencyRow shape.
 */
export function aggregateFoodFrequency(
  entries: Array<{
    date: Date;
    userId: string;
    foodName: string;
    foodGroup: string | null;
    itemType: string;
    quantity: number;
    unit: string;
  }>,
): FoodFrequencyRow[] {
  const groups = new Map<
    string,
    {
      date: Date;
      foodName: string;
      foodGroup: string | null;
      itemType: string;
      users: Set<string>;
      quantities: number[];
      units: string[];
    }
  >();

  for (const e of entries) {
    const dateKey = e.date.toISOString().slice(0, 10);
    const foodGroupKey = e.foodGroup ?? '__NULL_FOOD_GROUP__';
    const key = `${dateKey}||${e.foodName}||${e.itemType}||${foodGroupKey}`;
    if (!groups.has(key)) {
      groups.set(key, {
        date: new Date(dateKey),
        foodName: e.foodName,
        foodGroup: e.foodGroup,
        itemType: e.itemType,
        users: new Set(),
        quantities: [],
        units: [],
      });
    }
    const g = groups.get(key)!;
    g.users.add(e.userId);
    g.quantities.push(e.quantity);
    g.units.push(e.unit);
  }

  return [...groups.values()].map((g) => ({
    date: g.date,
    foodName: g.foodName,
    foodGroup: g.foodGroup,
    itemType: g.itemType,
    frequency: g.quantities.length,
    uniqueUsers: g.users.size,
    avgQuantity: safeAvg(g.quantities) ?? 0,
    predominantUnit: mode(g.units) ?? '',
  }));
}

export function toAnalyticsNutritionDto(row: any): AnalyticsNutritionDto {
  return {
    id: row.id,
    date: row.date,
    typeOfMeal: row.typeOfMeal,
    userCount: row.userCount,
    entityCount: row.mealCount,
    mealCount: row.mealCount,
    avgCalories: row.avgCalories,
    avgProteins: row.avgProteins,
    avgFat: row.avgFat,
    avgCarbs: row.avgCarbs,
    avgFiber: row.avgFiber,
    avgSodium: row.avgSodium,
    avgSugar: row.avgSugar,
    avgSaturatedFat: row.avgSaturatedFat,
    p25Calories: row.p25Calories,
    p50Calories: row.p50Calories,
    p75Calories: row.p75Calories,
    metadata: {
      valueUnit: 'per_meal',
      entityUnit: 'meal',
    },
  };
}

export function toAnalyticsFoodPopularityDto(
  row: any,
): AnalyticsFoodPopularityDto {
  return {
    id: row.id,
    date: row.date,
    itemName: row.foodName,
    itemGroup: row.foodGroup,
    foodName: row.foodName,
    foodGroup: row.foodGroup,
    itemType: row.itemType,
    frequency: row.frequency,
    uniqueUsers: row.uniqueUsers,
    avgQuantity: row.avgQuantity,
    predominantUnit: row.predominantUnit,
  };
}
