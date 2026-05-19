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
