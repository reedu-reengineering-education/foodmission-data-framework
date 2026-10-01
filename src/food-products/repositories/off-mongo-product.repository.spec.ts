import { OffMongoPrismaService } from '../../database/off-mongo-prisma.service';
import { OffMongoProductRepository } from './off-mongo-product.repository';

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
        nutriments: {
          proteins_100g: 8.5,
          fiber_100g: '6.2',
          fat_100g: 1,
          'saturated-fat_100g': 'n/a',
        },
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
          'nutriments.proteins_100g': 1,
          'nutriments.fiber_100g': 1,
          'nutriments.fat_100g': 1,
          'nutriments.saturated-fat_100g': 1,
        },
      },
    });
    expect(facts.get('111')).toEqual({
      categories: ['en:legumes'],
      labels: ['en:organic'],
      ingredientsAnalysisTags: ['en:vegan'],
      // Numeric strings are parsed; unparseable values become null.
      nutriments: { proteins: 8.5, fiber: 6.2, fat: 1, saturatedFat: null },
    });
    expect(facts.get('222')).toEqual({
      categories: [],
      labels: [],
      ingredientsAnalysisTags: [],
      nutriments: {
        proteins: null,
        fiber: null,
        fat: null,
        saturatedFat: null,
      },
    });
  });

  it('skips the query when Mongo is not configured or there are no barcodes', async () => {
    expect((await build(false).findMealFactsByBarcodes(['111'])).size).toBe(0);
    expect((await build().findMealFactsByBarcodes([])).size).toBe(0);
    expect(findRaw).not.toHaveBeenCalled();
  });

  it('returns no facts when the query fails', async () => {
    findRaw.mockRejectedValue(new Error('mongo down'));

    expect((await build().findMealFactsByBarcodes(['111'])).size).toBe(0);
  });

  it('returns no facts when the query times out', async () => {
    jest.useFakeTimers();
    findRaw.mockReturnValue(new Promise(() => undefined));

    const pending = build().findMealFactsByBarcodes(['111']);
    jest.advanceTimersByTime(2000);

    expect((await pending).size).toBe(0);
  });
});
