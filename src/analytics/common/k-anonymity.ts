/**
 * k-anonymity constants shared across all analytics aggregators.
 *
 * K=5  — suppress single-dimension groups with fewer than 5 unique users.
 * K=20 — suppress cross-dimensional groups (two dimensions combined)
 *         with fewer than 20 unique users.
 */

export const K_ANONYMITY_THRESHOLD = 5;
export const K_ANONYMITY_CROSS_DIM_THRESHOLD = 20;
