import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  safeAvg,
  K_ANONYMITY_THRESHOLD,
  K_ANONYMITY_CROSS_DIM_THRESHOLD,
  DEMOGRAPHIC_DIMENSIONS,
  DemographicDimensionEnum,
  parseLimit,
  parseDate,
  normalizeDimPair,
  percentile,
  stdDev,
  mode,
  distribution,
  applyKAnonymity,
  aggregateFoodFrequency,
  toAnalyticsNutritionDto,
  toAnalyticsFoodPopularityDto,
} from './analytics-utils';
import {
  getAnalyticsBatch,
  listAnalyticsBatches,
  approveAnalyticsBatch,
  publishAnalyticsBatch,
  rejectAnalyticsBatch,
  supersedeAnalyticsBatch,
  deleteAnalyticsBatch,
  autoPublishAndSupersede,
} from './batch-lifecycle';
import { runBatchGeneration, IAnalyticsAggregator } from './batch-runner';

// ============================================================
// Shared test helpers
// ============================================================

type Status = 'STAGING' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'SUPERSEDED';
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
    supersedeBatchesForPeriod: jest.fn().mockResolvedValue(undefined),
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

describe('normalizeDimPair', () => {
  it('returns dims unchanged when already in alphabetical order', () => {
    expect(normalizeDimPair('ageGroup', 'gender')).toEqual([
      'ageGroup',
      'gender',
    ]);
  });

  it('swaps dims when passed in reverse alphabetical order', () => {
    expect(normalizeDimPair('gender', 'ageGroup')).toEqual([
      'ageGroup',
      'gender',
    ]);
  });

  it('returns [undefined, undefined] when both are absent', () => {
    expect(normalizeDimPair(undefined, undefined)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('returns [dim, undefined] when only dim1 is provided', () => {
    expect(normalizeDimPair('gender', undefined)).toEqual([
      'gender',
      undefined,
    ]);
  });

  it('returns [undefined, dim] when only dim2 is provided', () => {
    expect(normalizeDimPair(undefined, 'gender')).toEqual([
      undefined,
      'gender',
    ]);
  });

  it('returns unchanged when both dims are equal', () => {
    expect(normalizeDimPair('gender', 'gender')).toEqual(['gender', 'gender']);
  });
});

// ============================================================
// analytics-utils — percentile
// ============================================================

describe('percentile', () => {
  it('returns null for an empty array', () => {
    expect(percentile([], 50)).toBeNull();
  });

  it('returns the only element for a single-element array', () => {
    expect(percentile([42], 50)).toBe(42);
  });

  it('returns the median of [1, 2, 3] at p=50', () => {
    expect(percentile([1, 2, 3], 50)).toBe(2);
  });

  it('returns the minimum at p=0', () => {
    expect(percentile([10, 20, 30], 0)).toBe(10);
  });

  it('returns the maximum at p=100', () => {
    expect(percentile([10, 20, 30], 100)).toBe(30);
  });

  it('interpolates between values', () => {
    // p=25 of [1,2,3,4] → 1.75
    expect(percentile([1, 2, 3, 4], 25)).toBeCloseTo(1.75);
  });

  it('sorts the input before computing', () => {
    expect(percentile([3, 1, 2], 50)).toBe(2);
  });
});

// ============================================================
// analytics-utils — stdDev
// ============================================================

describe('stdDev', () => {
  it('returns null for an empty array', () => {
    expect(stdDev([])).toBeNull();
  });

  it('returns null for a single-element array', () => {
    expect(stdDev([5])).toBeNull();
  });

  it('returns 0 for an array of identical values', () => {
    expect(stdDev([3, 3, 3])).toBeCloseTo(0);
  });

  it('computes the sample standard deviation', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → sample s ≈ 2.138
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138);
  });
});

// ============================================================
// analytics-utils — mode
// ============================================================

describe('mode', () => {
  it('returns null for an empty array', () => {
    expect(mode([])).toBeNull();
  });

  it('returns the only value for a single-element array', () => {
    expect(mode(['a'])).toBe('a');
  });

  it('returns the most frequent value', () => {
    expect(mode(['a', 'b', 'b', 'c'])).toBe('b');
  });

  it('returns the first-encountered value when all counts are equal', () => {
    // 'a' and 'b' both appear once — sort by count desc picks the first max
    const result = mode(['a', 'b']);
    expect(['a', 'b']).toContain(result);
  });
});

// ============================================================
// analytics-utils — distribution
// ============================================================

describe('distribution', () => {
  it('returns null for an empty array', () => {
    expect(distribution([])).toBeNull();
  });

  it('counts occurrences of each value', () => {
    expect(distribution(['a', 'b', 'a', 'c', 'b', 'b'])).toEqual({
      a: 2,
      b: 3,
      c: 1,
    });
  });

  it('returns a single-key object for a uniform array', () => {
    expect(distribution(['x', 'x', 'x'])).toEqual({ x: 3 });
  });
});

// ============================================================
// analytics-utils — query parsing
// ============================================================

describe('parseLimit', () => {
  it('returns the default limit for absent or empty values', () => {
    expect(parseLimit(undefined)).toBe(20);
    expect(parseLimit('')).toBe(20);
    expect(parseLimit(undefined, 10)).toBe(10);
  });

  it('accepts integer strings within the allowed range', () => {
    expect(parseLimit('1')).toBe(1);
    expect(parseLimit('42')).toBe(42);
    expect(parseLimit('100')).toBe(100);
  });

  it.each(['0', '101', '-1', '3.5', '5xyz', ' 5 '])(
    'rejects invalid limit %s',
    (value) => {
      expect(() => parseLimit(value)).toThrow(BadRequestException);
      expect(() => parseLimit(value)).toThrow(
        'Must be an integer between 1 and 100',
      );
    },
  );
});

describe('parseDate', () => {
  it('returns undefined for absent or empty values', () => {
    expect(parseDate(undefined, 'from')).toBeUndefined();
    expect(parseDate('', 'from')).toBeUndefined();
  });

  it('parses valid date strings', () => {
    expect(parseDate('2026-04-01', 'from')).toEqual(new Date('2026-04-01'));
  });

  it('rejects invalid date strings with the parameter name', () => {
    expect(() => parseDate('not-a-date', 'periodStart')).toThrow(
      BadRequestException,
    );
    expect(() => parseDate('not-a-date', 'periodStart')).toThrow(
      'for periodStart',
    );
  });
});

// ============================================================
// analytics-utils — k-anonymity
// ============================================================

describe('applyKAnonymity', () => {
  it('filters rows below the default userCount threshold', () => {
    const result = applyKAnonymity([
      { id: 'a', userCount: 4 },
      { id: 'b', userCount: 5 },
    ]);

    expect(result.rows).toEqual([{ id: 'b', userCount: 5 }]);
    expect(result.suppressed).toBe(1);
  });

  it('supports uniqueUsers and custom thresholds', () => {
    const result = applyKAnonymity(
      [
        { id: 'a', uniqueUsers: 19 },
        { id: 'b', uniqueUsers: 20 },
      ],
      'uniqueUsers',
      K_ANONYMITY_CROSS_DIM_THRESHOLD,
    );

    expect(result.rows).toEqual([{ id: 'b', uniqueUsers: 20 }]);
    expect(result.suppressed).toBe(1);
  });

  it('returns an empty result without suppressions for empty input', () => {
    expect(applyKAnonymity([])).toEqual({ rows: [], suppressed: 0 });
  });
});

// ============================================================
// analytics-utils — food frequency
// ============================================================

describe('aggregateFoodFrequency', () => {
  it('groups entries by date, food name, item type, and food group', () => {
    const result = aggregateFoodFrequency([
      {
        date: new Date('2026-04-01T10:00:00Z'),
        userId: 'u1',
        foodName: 'Milk',
        foodGroup: 'Dairy',
        itemType: 'food_product',
        quantity: 1,
        unit: 'L',
      },
      {
        date: new Date('2026-04-01T12:00:00Z'),
        userId: 'u2',
        foodName: 'Milk',
        foodGroup: 'Dairy',
        itemType: 'food_product',
        quantity: 3,
        unit: 'L',
      },
      {
        date: new Date('2026-04-01T12:00:00Z'),
        userId: 'u2',
        foodName: 'Milk',
        foodGroup: 'Plant-based drinks',
        itemType: 'food_product',
        quantity: 2,
        unit: 'L',
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      date: new Date('2026-04-01'),
      foodName: 'Milk',
      foodGroup: 'Dairy',
      itemType: 'food_product',
      frequency: 2,
      uniqueUsers: 2,
      avgQuantity: 2,
      predominantUnit: 'L',
    });
  });

  it('counts repeated entries from the same user once for uniqueUsers', () => {
    const result = aggregateFoodFrequency([
      {
        date: new Date('2026-04-01T10:00:00Z'),
        userId: 'u1',
        foodName: 'Apple',
        foodGroup: null,
        itemType: 'generic_food',
        quantity: 1,
        unit: 'PIECES',
      },
      {
        date: new Date('2026-04-01T11:00:00Z'),
        userId: 'u1',
        foodName: 'Apple',
        foodGroup: null,
        itemType: 'generic_food',
        quantity: 2,
        unit: 'KG',
      },
      {
        date: new Date('2026-04-01T12:00:00Z'),
        userId: 'u2',
        foodName: 'Apple',
        foodGroup: null,
        itemType: 'generic_food',
        quantity: 3,
        unit: 'PIECES',
      },
    ]);

    expect(result).toEqual([
      {
        date: new Date('2026-04-01'),
        foodName: 'Apple',
        foodGroup: null,
        itemType: 'generic_food',
        frequency: 3,
        uniqueUsers: 2,
        avgQuantity: 2,
        predominantUnit: 'PIECES',
      },
    ]);
  });
});

// ============================================================
// analytics-utils — mappers and dimensions
// ============================================================

describe('analytics mappers', () => {
  it('maps meal-log nutrition rows directly', () => {
    expect(
      toAnalyticsNutritionDto({
        id: 'n1',
        date: new Date('2026-04-01'),
        typeOfMeal: 'DINNER',
        userCount: 5,
        mealCount: 7,
        avgCalories: 300,
        avgProteins: 20,
        p50Calories: 310,
      }),
    ).toMatchObject({
      id: 'n1',
      typeOfMeal: 'DINNER',
      entityCount: 7,
      mealCount: 7,
      avgCalories: 300,
      avgProteins: 20,
      p50Calories: 310,
      metadata: {
        valueUnit: 'per_meal',
        entityUnit: 'meal',
      },
    });
  });

  it('maps food popularity rows to canonical item fields', () => {
    expect(
      toAnalyticsFoodPopularityDto({
        id: 'p1',
        date: new Date('2026-04-01'),
        foodName: 'Apple',
        foodGroup: 'Fruit',
        itemType: 'food_product',
        frequency: 10,
        uniqueUsers: 6,
        avgQuantity: 2,
        predominantUnit: 'PIECES',
      }),
    ).toMatchObject({
      itemName: 'Apple',
      itemGroup: 'Fruit',
      foodName: 'Apple',
      foodGroup: 'Fruit',
      frequency: 10,
      uniqueUsers: 6,
    });
  });
});

describe('demographic dimensions', () => {
  it('keeps the enum object aligned with allowed dimensions', () => {
    expect(DEMOGRAPHIC_DIMENSIONS).toEqual([
      'ageGroup',
      'country',
      'educationLevel',
      'gender',
      'region',
    ]);
    expect(DemographicDimensionEnum).toEqual({
      ageGroup: 'ageGroup',
      country: 'country',
      educationLevel: 'educationLevel',
      gender: 'gender',
      region: 'region',
    });
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
// batch-lifecycle — supersedeAnalyticsBatch
// ============================================================

describe('supersedeAnalyticsBatch', () => {
  it('transitions a PUBLISHED batch to SUPERSEDED', async () => {
    const repo = makeRepo(makeBatch('b1', 'PUBLISHED'));

    const result = await supersedeAnalyticsBatch(
      repo,
      'b1',
      'admin',
      'PUBLISHED',
      'SUPERSEDED',
    );

    expect(repo.updateBatchStatus).toHaveBeenCalledWith(
      'b1',
      'SUPERSEDED',
      'admin',
    );
    expect(result.status).toBe('SUPERSEDED');
  });

  it('throws BadRequestException when batch is not PUBLISHED', async () => {
    const repo = makeRepo(makeBatch('b1', 'APPROVED'));

    await expect(
      supersedeAnalyticsBatch(repo, 'b1', 'admin', 'PUBLISHED', 'SUPERSEDED'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      supersedeAnalyticsBatch(repo, 'b1', 'admin', 'PUBLISHED', 'SUPERSEDED'),
    ).rejects.toThrow('can only supersede PUBLISHED batches');
  });

  it('throws NotFoundException when batch does not exist', async () => {
    const repo = makeRepo(null);

    await expect(
      supersedeAnalyticsBatch(
        repo,
        'missing',
        'admin',
        'PUBLISHED',
        'SUPERSEDED',
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

    await deleteAnalyticsBatch(repo, 'b1', [
      'PUBLISHED',
      'APPROVED',
      'SUPERSEDED',
    ]);

    expect(repo.deleteBatch).toHaveBeenCalledWith('b1');
  });

  it('deletes a REJECTED batch', async () => {
    const repo = makeRepo(makeBatch('b1', 'REJECTED'));

    await deleteAnalyticsBatch(repo, 'b1', [
      'PUBLISHED',
      'APPROVED',
      'SUPERSEDED',
    ]);

    expect(repo.deleteBatch).toHaveBeenCalledWith('b1');
  });

  it('throws BadRequestException for a PUBLISHED batch', async () => {
    const repo = makeRepo(makeBatch('b1', 'PUBLISHED'));

    await expect(
      deleteAnalyticsBatch(repo, 'b1', ['PUBLISHED', 'APPROVED', 'SUPERSEDED']),
    ).rejects.toThrow(BadRequestException);
    await expect(
      deleteAnalyticsBatch(repo, 'b1', ['PUBLISHED', 'APPROVED', 'SUPERSEDED']),
    ).rejects.toThrow('Reject it first');
  });

  it('throws BadRequestException for an APPROVED batch', async () => {
    const repo = makeRepo(makeBatch('b1', 'APPROVED'));

    await expect(
      deleteAnalyticsBatch(repo, 'b1', ['PUBLISHED', 'APPROVED', 'SUPERSEDED']),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for a SUPERSEDED batch (audit history must be kept)', async () => {
    const repo = makeRepo(makeBatch('b1', 'SUPERSEDED'));

    await expect(
      deleteAnalyticsBatch(repo, 'b1', ['PUBLISHED', 'APPROVED', 'SUPERSEDED']),
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

    await deleteAnalyticsBatch(repo, 'b1', [
      'PUBLISHED',
      'APPROVED',
      'SUPERSEDED',
    ]).catch(() => {});

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
    aggregator.aggregate.mockImplementation(() => {
      order.push('aggregate');
      return Promise.resolve(mockResult);
    });
    createBatch.mockImplementation(() => {
      order.push('createBatch');
      return Promise.resolve('batch-123');
    });
    insertRows.mockImplementation(() => {
      order.push('insertRows');
      return Promise.resolve();
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

// ============================================================
// batch-lifecycle — autoPublishAndSupersede
// ============================================================

describe('autoPublishAndSupersede', () => {
  const periodStart = new Date('2026-04-01T00:00:00Z');
  const periodEnd = new Date('2026-04-02T00:00:00Z');

  it('calls updateBatchStatus before supersedeBatchesForPeriod', async () => {
    const repo = makeRepo(makeBatch('b1', 'STAGING'));
    const order: string[] = [];
    repo.updateBatchStatus.mockImplementation(() => {
      order.push('publish');
      return Promise.resolve({ id: 'b1', status: 'PUBLISHED' as const });
    });
    repo.supersedeBatchesForPeriod.mockImplementation(() => {
      order.push('supersede');
      return Promise.resolve();
    });

    await autoPublishAndSupersede(
      repo,
      'b1',
      'PUBLISHED' as any,
      'system',
      periodStart,
      periodEnd,
    );

    expect(order).toEqual(['publish', 'supersede']);
  });

  it('passes the correct arguments to each call', async () => {
    const repo = makeRepo(makeBatch('b1', 'STAGING'));

    await autoPublishAndSupersede(
      repo,
      'b1',
      'PUBLISHED' as any,
      'system',
      periodStart,
      periodEnd,
    );

    expect(repo.updateBatchStatus).toHaveBeenCalledWith(
      'b1',
      'PUBLISHED',
      'system',
    );
    expect(repo.supersedeBatchesForPeriod).toHaveBeenCalledWith(
      periodStart,
      periodEnd,
      'b1',
    );
  });

  it('does not call supersede if publish throws', async () => {
    const repo = makeRepo(makeBatch('b1', 'STAGING'));
    repo.updateBatchStatus.mockRejectedValue(new Error('publish failed'));

    await autoPublishAndSupersede(
      repo,
      'b1',
      'PUBLISHED' as any,
      'system',
      periodStart,
      periodEnd,
    ).catch(() => {});

    expect(repo.supersedeBatchesForPeriod).not.toHaveBeenCalled();
  });
});
