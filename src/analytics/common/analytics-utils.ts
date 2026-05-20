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
