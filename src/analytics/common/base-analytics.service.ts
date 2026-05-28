import { AnalyticsBatchStatus } from '@prisma/client';
import {
  IBatchRepository,
  getAnalyticsBatch,
  listAnalyticsBatches,
  approveAnalyticsBatch,
  publishAnalyticsBatch,
  rejectAnalyticsBatch,
  supersedeAnalyticsBatch,
  deleteAnalyticsBatch,
} from './batch-lifecycle';

export abstract class BaseAnalyticsService<
  TBatch extends { id: string; status: AnalyticsBatchStatus },
> {
  protected abstract readonly repository: IBatchRepository<
    AnalyticsBatchStatus,
    TBatch
  >;

  abstract generateBatch(periodStart: Date, periodEnd: Date): Promise<string>;

  async runDailyAggregation(): Promise<string> {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const batchId = await this.generateBatch(yesterday, today);
    await this.repository.updateBatchStatus(
      batchId,
      AnalyticsBatchStatus.PUBLISHED,
      'system',
    );
    return batchId;
  }

  async listBatches(status?: AnalyticsBatchStatus): Promise<TBatch[]> {
    return listAnalyticsBatches(this.repository, status);
  }

  async getBatch(batchId: string): Promise<TBatch> {
    return getAnalyticsBatch(this.repository, batchId);
  }

  async approveBatch(batchId: string, adminUserId: string): Promise<TBatch> {
    return approveAnalyticsBatch(
      this.repository,
      batchId,
      adminUserId,
      AnalyticsBatchStatus.STAGING,
      AnalyticsBatchStatus.APPROVED,
    );
  }

  async publishBatch(batchId: string, adminUserId: string): Promise<TBatch> {
    return publishAnalyticsBatch(
      this.repository,
      batchId,
      adminUserId,
      AnalyticsBatchStatus.APPROVED,
      AnalyticsBatchStatus.PUBLISHED,
    );
  }

  async rejectBatch(
    batchId: string,
    adminUserId: string,
    reason: string,
  ): Promise<TBatch> {
    return rejectAnalyticsBatch(
      this.repository,
      batchId,
      adminUserId,
      reason,
      AnalyticsBatchStatus.STAGING,
      AnalyticsBatchStatus.REJECTED,
    );
  }

  async supersedeBatch(batchId: string, adminUserId: string): Promise<TBatch> {
    return supersedeAnalyticsBatch(
      this.repository,
      batchId,
      adminUserId,
      AnalyticsBatchStatus.PUBLISHED,
      AnalyticsBatchStatus.SUPERSEDED,
    );
  }

  async deleteBatch(batchId: string): Promise<void> {
    return deleteAnalyticsBatch(this.repository, batchId, [
      AnalyticsBatchStatus.PUBLISHED,
      AnalyticsBatchStatus.APPROVED,
      AnalyticsBatchStatus.SUPERSEDED,
    ]);
  }
}
