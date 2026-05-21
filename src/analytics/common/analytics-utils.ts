import { BadRequestException } from '@nestjs/common';

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
