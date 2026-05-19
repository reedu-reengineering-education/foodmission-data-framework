import { BadRequestException } from '@nestjs/common';

/**
 * Contract every analytics aggregator must satisfy.
 * TResult is the domain-specific aggregation result type.
 */
export interface IAnalyticsAggregator<TResult> {
  aggregate(periodStart: Date, periodEnd: Date): Promise<TResult>;
}

/**
 * Generic batch generation orchestration.
 *
 * 1. Validates that periodStart < periodEnd.
 * 2. Delegates to the aggregator to compute all analytical slices.
 * 3. Calls the domain-specific `persist` callback (repo writes) and returns
 *    the new batch id.
 *
 * Keeping the `persist` callback domain-specific means the repository layer
 * (and its typed Prisma delegates) stay fully independent per data type.
 */
export async function runBatchGeneration<TResult>(
  periodStart: Date,
  periodEnd: Date,
  aggregator: IAnalyticsAggregator<TResult>,
  persist: (result: TResult) => Promise<string>,
): Promise<string> {
  if (periodStart >= periodEnd) {
    throw new BadRequestException('periodStart must be before periodEnd');
  }

  const result = await aggregator.aggregate(periodStart, periodEnd);
  return persist(result);
}
