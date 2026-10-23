import { Logger } from '@nestjs/common';
import { OffMongoPrismaService } from '../../database/off-mongo-prisma.service';
import {
  OffMongoProductRepository,
  SEARCH_MAX_TIME_MS,
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
  const runCommandRaw = jest.fn();
  const repository = new OffMongoProductRepository({
    isConfigured: true,
    offProduct: { findRaw },
    $runCommandRaw: runCommandRaw,
  } as unknown as OffMongoPrismaService);

  const docs = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      _id: String(i),
      product_name: `P${i}`,
    }));
  const findArgs = () => findRaw.mock.calls[0][0];
  /** Index-only keyword counts, by word. */
  const keywordCounts = (counts: Record<string, number>) =>
    runCommandRaw.mockImplementation((cmd: { query: { _keywords: string } }) =>
      Promise.resolve({ n: counts[cmd.query._keywords] ?? 0, ok: 1 }),
    );

  beforeEach(() => findRaw.mockResolvedValue([]));
  afterEach(() => jest.resetAllMocks());

  it('fetches one extra item instead of counting', async () => {
    await repository.search({ query: 'milk', page: 3, pageSize: 20 });

    expect(findArgs().options).toMatchObject({ skip: 40, limit: 21 });
    expect(runCommandRaw).not.toHaveBeenCalled();
  });

  it('reports hasMore and drops the extra item', async () => {
    findRaw.mockResolvedValue(docs(21));

    const result = await repository.search({ query: 'milk', pageSize: 20 });

    expect(result.items).toHaveLength(20);
    expect(result.hasMore).toBe(true);
  });

  it('reports no more pages when the page is not full', async () => {
    findRaw.mockResolvedValue(docs(3));

    const result = await repository.search({ query: 'milk', pageSize: 20 });

    expect(result).toMatchObject({ hasMore: false, page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(3);
  });

  it('hints the keyword index and filters on a single word directly', async () => {
    await repository.search({ query: 'Milk' });

    expect(findArgs().filter._keywords).toBe('milk');
    expect(findArgs().filter.$expr).toBeUndefined();
    expect(findArgs().options.hint).toBe('_keywords_1_unique_scans_n_-1');
  });

  it('anchors multi-word searches on the rarest word and checks the rest via $expr', async () => {
    keywordCounts({ mercadona: 900, avena: 4000, bebida: 20000 });

    await repository.search({ query: 'avena mercadona bebida' });

    expect(findArgs().filter._keywords).toBe('mercadona');
    expect(findArgs().filter.$expr).toEqual({
      $setIsSubset: [['avena', 'bebida'], '$_keywords'],
    });
    expect(findArgs().options.hint).toBe('_keywords_1_unique_scans_n_-1');
    expect(runCommandRaw).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 'products',
        query: { _keywords: 'avena' },
        hint: '_keywords_1_unique_scans_n_-1',
        maxTimeMS: SEARCH_MAX_TIME_MS,
      }),
    );
  });

  it('returns nothing without querying products when a word matches no product', async () => {
    keywordCounts({ avena: 4000, zzzz: 0 });

    const result = await repository.search({ query: 'avena zzzz' });

    expect(result).toEqual({
      items: [],
      hasMore: false,
      page: 1,
      pageSize: 20,
    });
    expect(findRaw).not.toHaveBeenCalled();
  });

  it('reads 64-bit counts', async () => {
    runCommandRaw.mockImplementation((cmd: { query: { _keywords: string } }) =>
      Promise.resolve({
        n: cmd.query._keywords === 'a' ? { $numberLong: '5' } : 9,
      }),
    );

    await repository.search({ query: 'a b' });

    expect(findArgs().filter._keywords).toBe('a');
  });

  it('ignores repeated words', async () => {
    await repository.search({ query: 'milk  milk' });

    expect(findArgs().filter._keywords).toBe('milk');
    expect(runCommandRaw).not.toHaveBeenCalled();
  });

  it('does not hint a keyword index when there are no search words', async () => {
    await repository.search({ categories: ['en:breads'] });

    expect(findArgs().filter._keywords).toBeUndefined();
    expect(findArgs().options.hint).toBeUndefined();
  });

  it('hints the matching keyword index for each sort', async () => {
    await repository.search({ query: 'milk', sortBy: 'last_modified_t' });
    expect(findArgs().options).toMatchObject({
      sort: { last_modified_t: -1 },
      hint: '_keywords_1_last_modified_t_-1',
    });

    findRaw.mockClear();
    await repository.search({ query: 'milk', sortBy: 'created_t' });
    expect(findArgs().options.sort).toEqual({ created_t: -1 });
    expect(findArgs().options.hint).toBeUndefined();
  });

  it('sorts by popularity by default', async () => {
    await repository.search({ query: 'milk' });

    expect(findArgs().options.sort).toEqual({ unique_scans_n: -1 });
  });

  it('lets Mongo abort slow queries', async () => {
    await repository.search({ query: 'milk' });

    expect(SEARCH_MAX_TIME_MS).toBe(4500);
    // findRaw needs a Duration shape (see SEARCH_MAX_TIME_DURATION).
    expect(findArgs().options.maxTimeMS).toEqual({
      secs: 4,
      nanos: 500_000_000,
    });
  });
});
