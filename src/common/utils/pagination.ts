export interface NormalizedPagination {
  skip: number;
  take: number;
}

/**
 * Provides safe defaults for pagination to avoid divide-by-zero and negative values.
 * Defaults: skip=0, take=10 when inputs are missing or invalid.
 */
export function normalizePagination(
  skip?: number,
  take?: number,
  defaults: NormalizedPagination = { skip: 0, take: 10 },
): NormalizedPagination {
  const safeTake =
    take !== undefined && take !== null && take > 0 ? take : defaults.take;
  const safeSkip =
    skip !== undefined && skip !== null && skip >= 0 ? skip : defaults.skip;

  return { skip: safeSkip, take: safeTake };
}
