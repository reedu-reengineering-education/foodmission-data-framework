import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * Minimal repository shape required by the shared batch lifecycle functions.
 * Each domain repository satisfies this via TypeScript structural typing.
 */
interface IBatchRepository<
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
