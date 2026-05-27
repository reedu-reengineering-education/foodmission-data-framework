import { Test, TestingModule } from '@nestjs/testing';
import { ShelfLifeService } from './shelf-life.service';
import { ShelfLifeRepository } from '../repositories/shelf-life.repository';

const makeShelfLife = (
  overrides: Partial<{
    id: string;
    name: string;
    categoryName: string | null;
    defaultStorageType: string | null;
    pantryMinDays: number | null;
    pantryMaxDays: number | null;
    refrigeratorMinDays: number | null;
    refrigeratorMaxDays: number | null;
    freezerMinDays: number | null;
    freezerMaxDays: number | null;
    keywords: string[];
  }> = {},
) => ({
  id: 'shelf-life-id',
  name: 'Milk',
  categoryName: 'Dairy Products & Eggs',
  defaultStorageType: 'refrigerator',
  pantryMinDays: null,
  pantryMaxDays: null,
  refrigeratorMinDays: 5,
  refrigeratorMaxDays: 7,
  freezerMinDays: 30,
  freezerMaxDays: 60,
  keywords: ['milk'],
  foodKeeperProductId: 1,
  pantryAfterOpeningDays: null,
  refrigeratorAfterOpeningDays: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  foods: [],
  foodCategories: [],
  ...overrides,
});

describe('ShelfLifeService', () => {
  let service: ShelfLifeService;

  const mockRepository = {
    findById: jest.fn(),
    findBestMatch: jest.fn(),
    findByCategoryHints: jest.fn(),
    findByProductId: jest.fn(),
    findByKeywords: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShelfLifeService,
        { provide: ShelfLifeRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ShelfLifeService>(ShelfLifeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveExpiryDate', () => {
    describe('Tier 1 — shelfLifeId (FK-linked record)', () => {
      it('returns auto_foodkeeper expiry when shelfLifeId resolves to a record with days', async () => {
        mockRepository.findById.mockResolvedValue(
          makeShelfLife({ refrigeratorMaxDays: 7 }),
        );
        const before = new Date();

        const result = await service.resolveExpiryDate({
          shelfLifeId: 'shelf-life-id',
          foodName: 'Milk',
          categoryHints: ['dairy products'],
        });

        const after = new Date();
        expect(result.source).toBe('auto_foodkeeper');
        expect(result.expiryDate).toBeInstanceOf(Date);
        const expectedMin = new Date(before);
        expectedMin.setDate(expectedMin.getDate() + 7);
        const expectedMax = new Date(after);
        expectedMax.setDate(expectedMax.getDate() + 7);
        expect(result.expiryDate!.getTime()).toBeGreaterThanOrEqual(
          expectedMin.getTime(),
        );
        expect(result.expiryDate!.getTime()).toBeLessThanOrEqual(
          expectedMax.getTime(),
        );
      });

      it('skips fallback tiers and returns undefined when shelfLifeId record is not found', async () => {
        mockRepository.findById.mockResolvedValue(null);

        const result = await service.resolveExpiryDate({
          shelfLifeId: 'orphaned-id',
          foodName: 'Milk',
          categoryHints: ['dairy products'],
        });

        expect(result.expiryDate).toBeUndefined();
        expect(result.source).toBeUndefined();
        expect(mockRepository.findBestMatch).not.toHaveBeenCalled();
        expect(mockRepository.findByCategoryHints).not.toHaveBeenCalled();
      });

      it('skips fallback tiers and returns undefined when shelfLifeId record has no days', async () => {
        mockRepository.findById.mockResolvedValue(
          makeShelfLife({
            refrigeratorMinDays: null,
            refrigeratorMaxDays: null,
            pantryMinDays: null,
            pantryMaxDays: null,
          }),
        );

        const result = await service.resolveExpiryDate({
          shelfLifeId: 'shelf-life-id',
          foodName: 'Milk',
        });

        expect(result.expiryDate).toBeUndefined();
        expect(result.source).toBeUndefined();
        expect(mockRepository.findBestMatch).not.toHaveBeenCalled();
      });
    });

    describe('Tier 2 — name-based fuzzy search', () => {
      it('resolves expiry from name match when no shelfLifeId is provided', async () => {
        mockRepository.findBestMatch.mockResolvedValue(
          makeShelfLife({ refrigeratorMaxDays: 10 }),
        );

        const result = await service.resolveExpiryDate({ foodName: 'Milk' });

        expect(mockRepository.findBestMatch).toHaveBeenCalledWith('Milk');
        expect(result.source).toBe('auto_foodkeeper');
        expect(result.expiryDate).toBeInstanceOf(Date);
      });

      it('falls through to category tier when name search finds no match', async () => {
        mockRepository.findBestMatch.mockResolvedValue(null);
        mockRepository.findByCategoryHints.mockResolvedValue(
          makeShelfLife({ pantryMaxDays: 30, defaultStorageType: 'pantry' }),
        );

        const result = await service.resolveExpiryDate({
          foodName: 'UnknownProduct',
          categoryHints: ['snacks'],
        });

        expect(mockRepository.findByCategoryHints).toHaveBeenCalledWith([
          'snacks',
        ]);
        expect(result.source).toBe('auto_foodkeeper');
        expect(result.expiryDate).toBeInstanceOf(Date);
      });

      it('falls through to category tier when name search throws NotFoundException', async () => {
        mockRepository.findBestMatch.mockResolvedValue(null);
        mockRepository.findByCategoryHints.mockResolvedValue(
          makeShelfLife({ pantryMaxDays: 14, defaultStorageType: 'pantry' }),
        );

        const result = await service.resolveExpiryDate({
          foodName: 'UnknownProduct',
          categoryHints: ['canned goods'],
        });

        expect(result.source).toBe('auto_foodkeeper');
        expect(result.expiryDate).toBeInstanceOf(Date);
      });

      it('re-throws non-NotFoundException errors from the name search', async () => {
        mockRepository.findBestMatch.mockRejectedValue(
          new Error('DB connection lost'),
        );

        await expect(
          service.resolveExpiryDate({ foodName: 'Milk' }),
        ).rejects.toThrow('DB connection lost');
      });
    });

    describe('Tier 3 — category-based match', () => {
      it('resolves expiry from category hints when name search fails', async () => {
        mockRepository.findBestMatch.mockResolvedValue(null);
        mockRepository.findByCategoryHints.mockResolvedValue(
          makeShelfLife({
            categoryName: 'Dairy Products',
            defaultStorageType: 'refrigerator',
            refrigeratorMaxDays: 14,
          }),
        );

        const result = await service.resolveExpiryDate({
          foodName: 'Artisan Brie',
          categoryHints: ['dairy products', 'cheeses'],
        });

        expect(mockRepository.findByCategoryHints).toHaveBeenCalledWith([
          'dairy products',
          'cheeses',
        ]);
        expect(result.source).toBe('auto_foodkeeper');
        expect(result.expiryDate).toBeInstanceOf(Date);
      });

      it('returns undefined when category fallback finds no match', async () => {
        mockRepository.findBestMatch.mockResolvedValue(null);
        mockRepository.findByCategoryHints.mockResolvedValue(null);

        const result = await service.resolveExpiryDate({
          foodName: 'UnknownProduct',
          categoryHints: ['exotic-unknown-xyz'],
        });

        expect(result.expiryDate).toBeUndefined();
        expect(result.source).toBeUndefined();
      });

      it('returns undefined when category fallback record has no days', async () => {
        mockRepository.findBestMatch.mockResolvedValue(null);
        mockRepository.findByCategoryHints.mockResolvedValue(
          makeShelfLife({
            defaultStorageType: 'refrigerator',
            refrigeratorMinDays: null,
            refrigeratorMaxDays: null,
          }),
        );

        const result = await service.resolveExpiryDate({
          foodName: 'UnknownProduct',
          categoryHints: ['dairy products'],
        });

        expect(result.expiryDate).toBeUndefined();
        expect(result.source).toBeUndefined();
      });

      it('skips category tier when no categoryHints are provided', async () => {
        mockRepository.findBestMatch.mockResolvedValue(null);

        const result = await service.resolveExpiryDate({
          foodName: 'UnknownProduct',
        });

        expect(mockRepository.findByCategoryHints).not.toHaveBeenCalled();
        expect(result.expiryDate).toBeUndefined();
      });
    });

    describe('null / missing inputs', () => {
      it('returns undefined when shelfLifeId is null and foodName is null', async () => {
        const result = await service.resolveExpiryDate({
          shelfLifeId: null,
          foodName: null,
        });

        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.findBestMatch).not.toHaveBeenCalled();
        expect(result.expiryDate).toBeUndefined();
        expect(result.source).toBeUndefined();
      });

      it('returns undefined when called with empty params', async () => {
        const result = await service.resolveExpiryDate({});

        expect(result.expiryDate).toBeUndefined();
        expect(result.source).toBeUndefined();
      });
    });
  });
});
