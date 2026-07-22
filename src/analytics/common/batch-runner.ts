import { BadRequestException } from '@nestjs/common';

/**
 * Contract every analytics aggregator must satisfy.
 * TResult is the domain-specific aggregation result type.
 */
export interface IAnalyticsAggregator<TResult> {
  aggregate(periodStart: Date, periodEnd: Date): Promise<TResult>;
}

export interface BatchInsertStep {
  name: string;
  run: () => Promise<unknown>;
  shouldRun?: boolean;
}

export async function runBatchInsertSteps(steps: BatchInsertStep[]): Promise<void> {
  for (const step of steps) {
    if (step.shouldRun === false) continue;
    await step.run();
  }
}

/**
 * Generic batch generation orchestration.
 *
 * 1. Validates that periodStart < periodEnd.
 * 2. Calls aggregator.aggregate() to compute all analytical slices.
 * 3. Calls createBatch() to insert the STAGING row and obtain a batch id.
 * 4. Calls insertRows() to bulk-insert all slice tables.
 *    If insertRows() throws, the orphaned batch row is deleted automatically
 *    so the DB is left clean — no half-written STAGING batches.
 * 5. Returns the batch id.
 *
 * Keeping createBatch/insertRows domain-specific means the repository layer
 * (and its typed Prisma delegates) stays fully independent per data type.
 */
export async function runBatchGeneration<TResult>(
  periodStart: Date,
  periodEnd: Date,
  aggregator: IAnalyticsAggregator<TResult>,
  createBatch: (result: TResult) => Promise<string>,
  insertRows: (batchId: string, result: TResult) => Promise<void>,
  deleteBatch: (batchId: string) => Promise<void>,
): Promise<string> {
  if (periodStart >= periodEnd) {
    throw new BadRequestException('periodStart must be before periodEnd');
  }

  const result = await aggregator.aggregate(periodStart, periodEnd);
  const batchId = await createBatch(result);

  try {
    await insertRows(batchId, result);
  } catch (err) {
    await deleteBatch(batchId).catch(() => undefined); // best-effort cleanup
    throw err;
  }

  return batchId;
}
