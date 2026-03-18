export interface NormalizedPagination {
  skip: number;
  take: number;
}

export interface PageLimitInput {
  page?: number;
  limit?: number;
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

/**
 * Converts page/limit input into skip/take (1-indexed pages).
 * Defaults: page=1, limit=10.
 */
export function pageLimitToSkipTake(
  input: PageLimitInput,
  defaults: { page: number; limit: number } = { page: 1, limit: 10 },
): NormalizedPagination {
  const page =
    input.page !== undefined && input.page !== null && input.page > 0
      ? input.page
      : defaults.page;
  const limit =
    input.limit !== undefined && input.limit !== null && input.limit > 0
      ? input.limit
      : defaults.limit;

  return { skip: (page - 1) * limit, take: limit };
}
