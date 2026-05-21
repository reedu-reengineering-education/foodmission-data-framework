/**
 * Shared demographic dimension constants used across all analytics aggregators,
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
 * ParseEnumPipe requires an object (not a union type), so we derive one from
 * DEMOGRAPHIC_DIMENSIONS. Values are identical to keys.
 */
export const DemographicDimensionEnum = Object.fromEntries(
  DEMOGRAPHIC_DIMENSIONS.map((d) => [d, d]),
) as Record<DemographicDimension, DemographicDimension>;
