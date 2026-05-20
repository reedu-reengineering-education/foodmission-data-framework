import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  safeAvg,
  K_ANONYMITY_THRESHOLD,
  K_ANONYMITY_CROSS_DIM_THRESHOLD,
} from './analytics-utils';
import {
  getAnalyticsBatch,
  listAnalyticsBatches,
  approveAnalyticsBatch,
  publishAnalyticsBatch,
  rejectAnalyticsBatch,
  deleteAnalyticsBatch,
} from './batch-lifecycle';
import { runBatchGeneration, IAnalyticsAggregator } from './batch-runner';

// ============================================================
// Shared test helpers
// ============================================================

type Status = 'STAGING' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
interface Batch {
  id: string;
  status: Status;
}

function makeBatch(id: string, status: Status): Batch {
  return { id, status };
}

function makeRepo(batch: Batch | null = null) {
  return {
    findBatchById: jest.fn().mockResolvedValue(batch),
    findBatches: jest.fn().mockResolvedValue(batch ? [batch] : []),
    updateBatchStatus: jest
      .fn()
      .mockImplementation((id: string, status: Status) =>
        Promise.resolve({ id, status }),
      ),
    deleteBatch: jest.fn().mockResolvedValue(undefined),
  };
}

// ============================================================
// analytics-utils
// ============================================================

describe('safeAvg', () => {
  it('returns null for an empty array', () => {
    expect(safeAvg([])).toBeNull();
  });

  it('returns the single value for a one-element array', () => {
    expect(safeAvg([42])).toBe(42);
  });

  it('returns the arithmetic mean', () => {
    expect(safeAvg([10, 20, 30])).toBe(20);
  });

  it('handles decimal results correctly', () => {
    expect(safeAvg([1, 2])).toBe(1.5);
  });

  it('handles negative values', () => {
    expect(safeAvg([-10, 10])).toBe(0);
  });

  it('handles a large array', () => {
    const values = Array.from({ length: 1000 }, (_, i) => i + 1); // 1..1000
    expect(safeAvg(values)).toBe(500.5);
  });
});

describe('K_ANONYMITY_THRESHOLD', () => {
  it('is 5', () => {
    expect(K_ANONYMITY_THRESHOLD).toBe(5);
  });
});

describe('K_ANONYMITY_CROSS_DIM_THRESHOLD', () => {
  it('is 20', () => {
    expect(K_ANONYMITY_CROSS_DIM_THRESHOLD).toBe(20);
  });

  it('is strictly greater than K_ANONYMITY_THRESHOLD', () => {
    expect(K_ANONYMITY_CROSS_DIM_THRESHOLD).toBeGreaterThan(
      K_ANONYMITY_THRESHOLD,
    );
  });
});

// ============================================================
// batch-lifecycle — getAnalyticsBatch
// ============================================================

describe('getAnalyticsBatch', () => {
  it('returns the batch when found', async () => {
    const batch = makeBatch('b1', 'STAGING');
    const repo = makeRepo(batch);

    const result = await getAnalyticsBatch(repo, 'b1');

    expect(result).toEqual(batch);
    expect(repo.findBatchById).toHaveBeenCalledWith('b1');
  });

  it('throws NotFoundException when batch does not exist', async () => {
    const repo = makeRepo(null);

    await expect(getAnalyticsBatch(repo, 'missing')).rejects.toThrow(
      NotFoundException,
    );
    await expect(getAnalyticsBatch(repo, 'missing')).rejects.toThrow(
      'Batch missing not found',
    );
  });
});

// ============================================================
// batch-lifecycle — listAnalyticsBatches
// ============================================================

describe('listAnalyticsBatches', () => {
  it('delegates to repo.findBatches with no filter', async () => {
    const batch = makeBatch('b1', 'PUBLISHED');
    const repo = makeRepo(batch);

    const result = await listAnalyticsBatches(repo);

    expect(repo.findBatches).toHaveBeenCalledWith(undefined);
    expect(result).toEqual([batch]);
  });

  it('passes status filter through to the repo', async () => {
    const repo = makeRepo(null);
    repo.findBatches.mockResolvedValue([]);

    await listAnalyticsBatches(repo, 'STAGING');

    expect(repo.findBatches).toHaveBeenCalledWith('STAGING');
  });
});

// ============================================================
// batch-lifecycle — approveAnalyticsBatch
// ============================================================

describe('approveAnalyticsBatch', () => {
  it('transitions a STAGING batch to APPROVED', async () => {
    const repo = makeRepo(makeBatch('b1', 'STAGING'));

    const result = await approveAnalyticsBatch(
      repo,
      'b1',
      'admin',
      'STAGING',
      'APPROVED',
    );

    expect(repo.updateBatchStatus).toHaveBeenCalledWith(
      'b1',
      'APPROVED',
      'admin',
    );
    expect(result.status).toBe('APPROVED');
  });

  it('throws BadRequestException when batch is not STAGING', async () => {
    const repo = makeRepo(makeBatch('b1', 'PUBLISHED'));

    await expect(
      approveAnalyticsBatch(repo, 'b1', 'admin', 'STAGING', 'APPROVED'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      approveAnalyticsBatch(repo, 'b1', 'admin', 'STAGING', 'APPROVED'),
    ).rejects.toThrow('can only approve STAGING batches');
  });

  it('throws NotFoundException when batch does not exist', async () => {
    const repo = makeRepo(null);

    await expect(
      approveAnalyticsBatch(repo, 'missing', 'admin', 'STAGING', 'APPROVED'),
    ).rejects.toThrow(NotFoundException);
  });

  it('does not call updateBatchStatus when batch is not found', async () => {
    const repo = makeRepo(null);

    await approveAnalyticsBatch(
      repo,
      'missing',
      'admin',
      'STAGING',
      'APPROVED',
    ).catch(() => {});

    expect(repo.updateBatchStatus).not.toHaveBeenCalled();
  });
});

// ============================================================
// batch-lifecycle — publishAnalyticsBatch
// ============================================================

describe('publishAnalyticsBatch', () => {
  it('transitions an APPROVED batch to PUBLISHED', async () => {
    const repo = makeRepo(makeBatch('b1', 'APPROVED'));

    const result = await publishAnalyticsBatch(
      repo,
      'b1',
      'admin',
      'APPROVED',
      'PUBLISHED',
    );

    expect(repo.updateBatchStatus).toHaveBeenCalledWith(
      'b1',
      'PUBLISHED',
      'admin',
    );
    expect(result.status).toBe('PUBLISHED');
  });

  it('throws BadRequestException when batch is STAGING (not APPROVED)', async () => {
    const repo = makeRepo(makeBatch('b1', 'STAGING'));

    await expect(
      publishAnalyticsBatch(repo, 'b1', 'admin', 'APPROVED', 'PUBLISHED'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      publishAnalyticsBatch(repo, 'b1', 'admin', 'APPROVED', 'PUBLISHED'),
    ).rejects.toThrow('can only publish APPROVED batches');
  });

  it('throws NotFoundException when batch does not exist', async () => {
    const repo = makeRepo(null);

    await expect(
      publishAnalyticsBatch(repo, 'missing', 'admin', 'APPROVED', 'PUBLISHED'),
    ).rejects.toThrow(NotFoundException);
  });
});

// ============================================================
// batch-lifecycle — rejectAnalyticsBatch
// ============================================================

describe('rejectAnalyticsBatch', () => {
  it('transitions a STAGING batch to REJECTED with a reason', async () => {
    const repo = makeRepo(makeBatch('b1', 'STAGING'));

    const result = await rejectAnalyticsBatch(
      repo,
      'b1',
      'admin',
      'bad data',
      'STAGING',
      'REJECTED',
    );

    expect(repo.updateBatchStatus).toHaveBeenCalledWith(
      'b1',
      'REJECTED',
      'admin',
      'bad data',
    );
    expect(result.status).toBe('REJECTED');
  });

  it('throws BadRequestException when batch is not STAGING', async () => {
    const repo = makeRepo(makeBatch('b1', 'APPROVED'));

    await expect(
      rejectAnalyticsBatch(
        repo,
        'b1',
        'admin',
        'reason',
        'STAGING',
        'REJECTED',
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      rejectAnalyticsBatch(
        repo,
        'b1',
        'admin',
        'reason',
        'STAGING',
        'REJECTED',
      ),
    ).rejects.toThrow('can only reject STAGING batches');
  });

  it('throws NotFoundException when batch does not exist', async () => {
    const repo = makeRepo(null);

    await expect(
      rejectAnalyticsBatch(
        repo,
        'missing',
        'admin',
        'reason',
        'STAGING',
        'REJECTED',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

// ============================================================
// batch-lifecycle — deleteAnalyticsBatch
// ============================================================

describe('deleteAnalyticsBatch', () => {
  it('deletes a STAGING batch', async () => {
    const repo = makeRepo(makeBatch('b1', 'STAGING'));

    await deleteAnalyticsBatch(repo, 'b1', ['PUBLISHED', 'APPROVED']);

    expect(repo.deleteBatch).toHaveBeenCalledWith('b1');
  });

  it('deletes a REJECTED batch', async () => {
    const repo = makeRepo(makeBatch('b1', 'REJECTED'));

    await deleteAnalyticsBatch(repo, 'b1', ['PUBLISHED', 'APPROVED']);

    expect(repo.deleteBatch).toHaveBeenCalledWith('b1');
  });

  it('throws BadRequestException for a PUBLISHED batch', async () => {
    const repo = makeRepo(makeBatch('b1', 'PUBLISHED'));

    await expect(
      deleteAnalyticsBatch(repo, 'b1', ['PUBLISHED', 'APPROVED']),
    ).rejects.toThrow(BadRequestException);
    await expect(
      deleteAnalyticsBatch(repo, 'b1', ['PUBLISHED', 'APPROVED']),
    ).rejects.toThrow('Reject it first');
  });

  it('throws BadRequestException for an APPROVED batch', async () => {
    const repo = makeRepo(makeBatch('b1', 'APPROVED'));

    await expect(
      deleteAnalyticsBatch(repo, 'b1', ['PUBLISHED', 'APPROVED']),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when batch does not exist', async () => {
    const repo = makeRepo(null);

    await expect(
      deleteAnalyticsBatch(repo, 'missing', ['PUBLISHED']),
    ).rejects.toThrow(NotFoundException);
  });

  it('does not call deleteBatch when batch is protected', async () => {
    const repo = makeRepo(makeBatch('b1', 'PUBLISHED'));

    await deleteAnalyticsBatch(repo, 'b1', ['PUBLISHED', 'APPROVED']).catch(
      () => {},
    );

    expect(repo.deleteBatch).not.toHaveBeenCalled();
  });
});

// ============================================================
// batch-runner — runBatchGeneration
// ============================================================

describe('runBatchGeneration', () => {
  const start = new Date('2026-04-01T00:00:00Z');
  const end = new Date('2026-04-02T00:00:00Z');
  const mockResult = { totalRecords: 10, suppressedGroups: 1 };

  let aggregator: jest.Mocked<IAnalyticsAggregator<typeof mockResult>>;
  let createBatch: jest.MockedFunction<
    (r: typeof mockResult) => Promise<string>
  >;
  let insertRows: jest.MockedFunction<
    (id: string, r: typeof mockResult) => Promise<void>
  >;
  let deleteBatch: jest.MockedFunction<(id: string) => Promise<void>>;

  beforeEach(() => {
    aggregator = { aggregate: jest.fn().mockResolvedValue(mockResult) };
    createBatch = jest.fn().mockResolvedValue('batch-123');
    insertRows = jest.fn().mockResolvedValue(undefined);
    deleteBatch = jest.fn().mockResolvedValue(undefined);
  });

  it('returns the batch id on success', async () => {
    const id = await runBatchGeneration(
      start,
      end,
      aggregator,
      createBatch,
      insertRows,
      deleteBatch,
    );

    expect(id).toBe('batch-123');
  });

  it('calls aggregator, createBatch, then insertRows in order', async () => {
    const order: string[] = [];
    aggregator.aggregate.mockImplementation(async () => {
      order.push('aggregate');
      return mockResult;
    });
    createBatch.mockImplementation(async () => {
      order.push('createBatch');
      return 'batch-123';
    });
    insertRows.mockImplementation(async () => {
      order.push('insertRows');
    });

    await runBatchGeneration(
      start,
      end,
      aggregator,
      createBatch,
      insertRows,
      deleteBatch,
    );

    expect(order).toEqual(['aggregate', 'createBatch', 'insertRows']);
  });

  it('passes aggregation result to createBatch', async () => {
    await runBatchGeneration(
      start,
      end,
      aggregator,
      createBatch,
      insertRows,
      deleteBatch,
    );

    expect(createBatch).toHaveBeenCalledWith(mockResult);
  });

  it('passes batchId and result to insertRows', async () => {
    await runBatchGeneration(
      start,
      end,
      aggregator,
      createBatch,
      insertRows,
      deleteBatch,
    );

    expect(insertRows).toHaveBeenCalledWith('batch-123', mockResult);
  });

  it('throws BadRequestException when periodStart equals periodEnd', async () => {
    await expect(
      runBatchGeneration(
        start,
        start,
        aggregator,
        createBatch,
        insertRows,
        deleteBatch,
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      runBatchGeneration(
        start,
        start,
        aggregator,
        createBatch,
        insertRows,
        deleteBatch,
      ),
    ).rejects.toThrow('periodStart must be before periodEnd');
  });

  it('throws BadRequestException when periodStart is after periodEnd', async () => {
    await expect(
      runBatchGeneration(
        end,
        start,
        aggregator,
        createBatch,
        insertRows,
        deleteBatch,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not call aggregator when dates are invalid', async () => {
    await runBatchGeneration(
      end,
      start,
      aggregator,
      createBatch,
      insertRows,
      deleteBatch,
    ).catch(() => {});

    expect(aggregator.aggregate).not.toHaveBeenCalled();
  });

  it('calls deleteBatch and rethrows when insertRows fails', async () => {
    const insertError = new Error('DB write failed');
    insertRows.mockRejectedValue(insertError);

    await expect(
      runBatchGeneration(
        start,
        end,
        aggregator,
        createBatch,
        insertRows,
        deleteBatch,
      ),
    ).rejects.toThrow('DB write failed');

    expect(deleteBatch).toHaveBeenCalledWith('batch-123');
  });

  it('still rethrows original error even if deleteBatch also fails', async () => {
    insertRows.mockRejectedValue(new Error('insert failed'));
    deleteBatch.mockRejectedValue(new Error('delete failed'));

    await expect(
      runBatchGeneration(
        start,
        end,
        aggregator,
        createBatch,
        insertRows,
        deleteBatch,
      ),
    ).rejects.toThrow('insert failed');
  });

  it('does not call deleteBatch on success', async () => {
    await runBatchGeneration(
      start,
      end,
      aggregator,
      createBatch,
      insertRows,
      deleteBatch,
    );

    expect(deleteBatch).not.toHaveBeenCalled();
  });

  it('does not call deleteBatch when aggregator fails', async () => {
    aggregator.aggregate.mockRejectedValue(new Error('agg failed'));

    await runBatchGeneration(
      start,
      end,
      aggregator,
      createBatch,
      insertRows,
      deleteBatch,
    ).catch(() => {});

    expect(deleteBatch).not.toHaveBeenCalled();
  });

  it('does not call deleteBatch when createBatch fails', async () => {
    createBatch.mockRejectedValue(new Error('create failed'));

    await runBatchGeneration(
      start,
      end,
      aggregator,
      createBatch,
      insertRows,
      deleteBatch,
    ).catch(() => {});

    expect(deleteBatch).not.toHaveBeenCalled();
  });
});
