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
