import { Logger } from '@nestjs/common';
import { OffMongoPrismaService } from '../../database/off-mongo-prisma.service';
import {
  MAX_COUNTED_RESULTS,
  OffMongoProductRepository,
} from './off-mongo-product.repository';

describe('OffMongoProductRepository.findMealFactsByBarcodes', () => {
  const findRaw = jest.fn();
  const build = (isConfigured = true) =>
    new OffMongoProductRepository({
      isConfigured,
      offProduct: { findRaw },
    } as unknown as OffMongoPrismaService);

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('loads tags for all barcodes in one projected query', async () => {
    findRaw.mockResolvedValue([
      {
        _id: '111',
        categories_tags: ['en:legumes'],
        labels_tags: ['en:organic'],
        ingredients_analysis_tags: ['en:vegan'],
      },
      { _id: '222' },
    ]);

    const facts = await build().findMealFactsByBarcodes(['111', '222']);

    expect(findRaw).toHaveBeenCalledWith({
      filter: { _id: { $in: ['111', '222'] } },
      options: {
        projection: {
          categories_tags: 1,
          labels_tags: 1,
          ingredients_analysis_tags: 1,
        },
      },
    });
    expect(facts.get('111')).toEqual({
      categories: ['en:legumes'],
      labels: ['en:organic'],
      ingredientsAnalysisTags: ['en:vegan'],
    });
    expect(facts.get('222')).toEqual({
      categories: [],
      labels: [],
      ingredientsAnalysisTags: [],
    });
  });

  it('skips the query when Mongo is not configured or there are no barcodes', async () => {
    expect((await build(false).findMealFactsByBarcodes(['111'])).size).toBe(0);
    expect((await build().findMealFactsByBarcodes([])).size).toBe(0);
    expect(findRaw).not.toHaveBeenCalled();
  });

  it('returns no facts, and warns, when the query fails', async () => {
    findRaw.mockRejectedValue(new Error('mongo down'));
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    expect((await build().findMealFactsByBarcodes(['111'])).size).toBe(0);
    expect(warn).toHaveBeenCalledWith(
      'OFF Mongo meal-facts lookup failed for 1 barcode(s), deriving meal flags without OFF data: mongo down',
    );
    warn.mockRestore();
  });

  it('returns no facts when the query times out', async () => {
    jest.useFakeTimers();
    findRaw.mockReturnValue(new Promise(() => undefined));

    const pending = build().findMealFactsByBarcodes(['111']);
    jest.advanceTimersByTime(2000);

    expect((await pending).size).toBe(0);
  });
});

describe('OffMongoProductRepository.search', () => {
  const findRaw = jest.fn();
  const aggregateRaw = jest.fn();
  const repository = new OffMongoProductRepository({
    isConfigured: true,
    offProduct: { findRaw, aggregateRaw },
  } as unknown as OffMongoPrismaService);

  const docs = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      _id: String(i),
      product_name: `P${i}`,
    }));

  afterEach(() => jest.clearAllMocks());

  it(`stops counting after ${MAX_COUNTED_RESULTS} matches`, async () => {
    findRaw.mockResolvedValue([]);
    aggregateRaw.mockResolvedValue([]);

    await repository.search({ query: 'milk' });

    const pipeline = aggregateRaw.mock.calls[0][0].pipeline;
    expect(pipeline.map((stage: object) => Object.keys(stage)[0])).toEqual([
      '$match',
      '$limit',
      '$count',
    ]);
    expect(pipeline[1]).toEqual({ $limit: MAX_COUNTED_RESULTS });
  });

  it('reports an exact count below the cap', async () => {
    findRaw.mockResolvedValue(docs(3));
    aggregateRaw.mockResolvedValue([{ count: 3 }]);

    const result = await repository.search({ query: 'milk' });

    expect(result).toMatchObject({ totalCount: 3, totalCountCapped: false });
  });

  it('flags the count as capped at the limit', async () => {
    findRaw.mockResolvedValue(docs(20));
    aggregateRaw.mockResolvedValue([{ count: MAX_COUNTED_RESULTS }]);

    const result = await repository.search({ query: 'milk', pageSize: 20 });

    expect(result).toMatchObject({
      totalCount: MAX_COUNTED_RESULTS,
      totalCountCapped: true,
    });
  });

  it('keeps the total ahead of the current page when paging past the cap', async () => {
    findRaw.mockResolvedValue(docs(20));
    aggregateRaw.mockResolvedValue([{ count: MAX_COUNTED_RESULTS }]);

    const result = await repository.search({
      query: 'milk',
      page: 6,
      pageSize: 20,
    });

    expect(findRaw.mock.calls[0][0].options).toMatchObject({
      skip: 100,
      limit: 20,
    });
    expect(result.totalCount).toBe(120);
    expect(result.totalCountCapped).toBe(true);
  });

  it('returns zero when nothing matches', async () => {
    findRaw.mockResolvedValue([]);
    aggregateRaw.mockResolvedValue([]);

    const result = await repository.search({ query: 'zzz' });

    expect(result).toMatchObject({ totalCount: 0, totalCountCapped: false });
  });
});
