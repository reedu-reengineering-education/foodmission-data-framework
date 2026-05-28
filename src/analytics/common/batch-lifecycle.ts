import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * Minimal repository shape required by the shared batch lifecycle functions.
 * Each domain repository satisfies this via TypeScript structural typing.
 */
export interface IBatchRepository<
  TStatus extends string,
  TBatch extends { id: string; status: TStatus },
> {
  findBatchById(id: string): Promise<TBatch | null>;
  findBatches(status?: TStatus): Promise<TBatch[]>;
  updateBatchStatus(
    id: string,
    status: TStatus,
    adminUserId?: string,
    reason?: string,
  ): Promise<TBatch>;
  deleteBatch(id: string): Promise<void>;
  supersedeBatchesForPeriod(from: Date, to: Date, excludeId: string): Promise<void>;
}

export interface BatchStatusUpdateFields {
  publishedAt?: Date;
  publishedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
}

export function buildStatusUpdateFields<TStatus extends string>(
  status: TStatus,
  publishedStatus: TStatus,
  rejectedStatus: TStatus,
  userId?: string,
  reason?: string,
): BatchStatusUpdateFields {
  if (status === publishedStatus) {
    return {
      publishedAt: new Date(),
      publishedBy: userId,
    };
  }
  if (status === rejectedStatus) {
    return {
      rejectedAt: new Date(),
      rejectedBy: userId,
      rejectionReason: reason,
    };
  }
  return {};
}

export async function getAnalyticsBatch<
  TStatus extends string,
  TBatch extends { id: string; status: TStatus },
>(repo: IBatchRepository<TStatus, TBatch>, batchId: string): Promise<TBatch> {
  const batch = await repo.findBatchById(batchId);
  if (!batch) throw new NotFoundException(`Batch ${batchId} not found`);
  return batch;
}

export async function listAnalyticsBatches<
  TStatus extends string,
  TBatch extends { id: string; status: TStatus },
>(
  repo: IBatchRepository<TStatus, TBatch>,
  status?: TStatus,
): Promise<TBatch[]> {
  return repo.findBatches(status);
}

export async function approveAnalyticsBatch<
  TStatus extends string,
  TBatch extends { id: string; status: TStatus },
>(
  repo: IBatchRepository<TStatus, TBatch>,
  batchId: string,
  adminUserId: string,
  stagingStatus: TStatus,
  approvedStatus: TStatus,
): Promise<TBatch> {
  const batch = await getAnalyticsBatch(repo, batchId);
  if (batch.status !== stagingStatus) {
    throw new BadRequestException(
      `Batch is ${String(batch.status)}, can only approve STAGING batches`,
    );
  }
  return repo.updateBatchStatus(batchId, approvedStatus, adminUserId);
}

export async function publishAnalyticsBatch<
  TStatus extends string,
  TBatch extends { id: string; status: TStatus },
>(
  repo: IBatchRepository<TStatus, TBatch>,
  batchId: string,
  adminUserId: string,
  approvedStatus: TStatus,
  publishedStatus: TStatus,
): Promise<TBatch> {
  const batch = await getAnalyticsBatch(repo, batchId);
  if (batch.status !== approvedStatus) {
    throw new BadRequestException(
      `Batch is ${String(batch.status)}, can only publish APPROVED batches`,
    );
  }
  return repo.updateBatchStatus(batchId, publishedStatus, adminUserId);
}

export async function rejectAnalyticsBatch<
  TStatus extends string,
  TBatch extends { id: string; status: TStatus },
>(
  repo: IBatchRepository<TStatus, TBatch>,
  batchId: string,
  adminUserId: string,
  reason: string,
  stagingStatus: TStatus,
  rejectedStatus: TStatus,
): Promise<TBatch> {
  const batch = await getAnalyticsBatch(repo, batchId);
  if (batch.status !== stagingStatus) {
    throw new BadRequestException(
      `Batch is ${String(batch.status)}, can only reject STAGING batches`,
    );
  }
  return repo.updateBatchStatus(batchId, rejectedStatus, adminUserId, reason);
}

export async function supersedeAnalyticsBatch<
  TStatus extends string,
  TBatch extends { id: string; status: TStatus },
>(
  repo: IBatchRepository<TStatus, TBatch>,
  batchId: string,
  adminUserId: string,
  publishedStatus: TStatus,
  supersededStatus: TStatus,
): Promise<TBatch> {
  const batch = await getAnalyticsBatch(repo, batchId);
  if (batch.status !== publishedStatus) {
    throw new BadRequestException(
      `Batch is ${String(batch.status)}, can only supersede PUBLISHED batches`,
    );
  }
  return repo.updateBatchStatus(batchId, supersededStatus, adminUserId);
}

export async function deleteAnalyticsBatch<
  TStatus extends string,
  TBatch extends { id: string; status: TStatus },
>(
  repo: IBatchRepository<TStatus, TBatch>,
  batchId: string,
  protectedStatuses: TStatus[],
): Promise<void> {
  const batch = await getAnalyticsBatch(repo, batchId);
  if (protectedStatuses.includes(batch.status)) {
    throw new BadRequestException(
      `Cannot delete ${String(batch.status)} batch. Reject it first.`,
    );
  }
  await repo.deleteBatch(batchId);
}

/**
 * Publishes a newly generated batch and supersedes any previously PUBLISHED
 * batches that overlap the same period — in that order, so the old data
 * remains visible until the new batch is confirmed published.
 *
 * The newly published batch is excluded from the supersede query so it
 * cannot be immediately superseded by its own call.
 */
export async function autoPublishAndSupersede<
  TStatus extends string,
  TBatch extends { id: string; status: TStatus },
>(
  repo: IBatchRepository<TStatus, TBatch>,
  batchId: string,
  publishedStatus: TStatus,
  userId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<void> {
  await repo.updateBatchStatus(batchId, publishedStatus, userId);
  await repo.supersedeBatchesForPeriod(periodStart, periodEnd, batchId);
}
