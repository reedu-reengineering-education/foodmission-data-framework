import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Foodex2FoodService } from './foodex2-food.service';
import {
  Foodex2Repository,
  Foodex2SearchRow,
} from '../repositories/foodex2.repository';
import { TranslationService } from '../../translations/services/translation.service';

/**
 * The three NEVO pasta records behind the single FoodEx2 concept "Dried pasta".
 * Their nutrients differ enormously because dry and cooked pasta differ in water
 * content — the reason the concept must resolve to one record rather than an
 * average.
 */
const NEVO_PASTA_DRY: any = {
  id: 'generic-4',
  nevoCode: 4,
  foodName: 'Pasta white raw',
  foodGroup: 'Cereals and cereal products',
  vegan: true,
  vegetarian: true,
  meatOrFish: false,
  legume: false,
  energyKj: 1531,
  energyKcal: 361,
  water: 10.4,
  proteins: 12.5,
  fat: 1.5,
  saturatedFat: 0.3,
  carbohydrates: 71.6,
  sugars: 3.2,
  fiber: 3.1,
  salt: 0.02,
  sodium: 8,
};

const NEVO_PASTA_COOKED: any = {
  ...NEVO_PASTA_DRY,
  id: 'generic-2779',
  nevoCode: 2779,
  foodName: 'Pasta white wo egg boiled',
  energyKj: 619,
  energyKcal: 146,
  water: 63.6,
  proteins: 5.1,
  carbohydrates: 29,
};

const CONCEPT_ROW: Foodex2SearchRow = {
  termId: 'term-a007l',
  code: 'A007L',
  name: 'Dried pasta',
  nameEn: 'Dried pasta',
  shortName: null,
  isCore: true,
  parentCode: 'A007G',
  nevoCode: 4,
  sourceFoodex2Code: 'A007P',
  hierarchyDepth: 1,
  variantCount: 3,
  matchRank: 2,
};

describe('Foodex2FoodService', () => {
  let service: Foodex2FoodService;
  let repository: jest.Mocked<Foodex2Repository>;

  const mockRepository: any = {
    search: jest.fn(),
    findByCode: jest.fn(),
    findGenericFoodsByNevoCodes: jest.fn(),
  };

  const mockTranslationService: any = {
    resolveLocale: jest.fn((lang?: string) => lang ?? 'en'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Foodex2FoodService,
        { provide: Foodex2Repository, useValue: mockRepository },
        { provide: TranslationService, useValue: mockTranslationService },
      ],
    }).compile();

    service = module.get(Foodex2FoodService);
    repository = module.get(Foodex2Repository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    beforeEach(() => {
      repository.search.mockResolvedValue({ rows: [CONCEPT_ROW], total: 1 });
      repository.findGenericFoodsByNevoCodes.mockResolvedValue(
        new Map([[4, NEVO_PASTA_DRY]]),
      );
    });

    it('returns one FoodEx2 food instead of every NEVO variant', async () => {
      const result = await service.search({
        search: 'pasta',
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].foodName).toBe('Dried pasta');
      expect(result.items[0].foodex2Code).toBe('A007L');
      // The concept covers three NEVO records but is a single search result.
      expect(result.items[0].variantCount).toBe(3);
    });

    it('does not surface the NEVO name as the food name', async () => {
      const [food] = (await service.search({ search: 'pasta' })).items;

      expect(food.foodName).not.toBe('Pasta white raw');
      // The NEVO record stays available as provenance.
      expect(food.source.foodName).toBe('Pasta white raw');
      expect(food.source.nevoCode).toBe(4);
    });

    it('returns the canonical record’s nutrients verbatim, never an average', async () => {
      const [food] = (await service.search({ search: 'pasta' })).items;

      // Nutrients are flat, exactly as GET /generic-foods returns them.
      expect(food.energyKcal).toBe(NEVO_PASTA_DRY.energyKcal);
      expect(food.energyKj).toBe(NEVO_PASTA_DRY.energyKj);
      expect(food.proteins).toBe(NEVO_PASTA_DRY.proteins);
      expect(food.carbohydrates).toBe(NEVO_PASTA_DRY.carbohydrates);

      // An average of the dry and cooked records would land between the two.
      const average =
        (NEVO_PASTA_DRY.energyKcal + NEVO_PASTA_COOKED.energyKcal) / 2;
      expect(food.energyKcal).not.toBeCloseTo(average);
      expect(food.water).toBe(NEVO_PASTA_DRY.water);
    });

    it('uses the canonical GenericFood id as `id`, not the FoodEx2 term id', async () => {
      const [food] = (await service.search({ search: 'pasta' })).items;

      // This is what a client posts as `genericFoodId` when adding a pantry or
      // shopping item. Returning the term id here would break that foreign key.
      expect(food.id).toBe('generic-4');
      expect(food.id).not.toBe(CONCEPT_ROW.termId);
      expect(food.source.genericFoodId).toBe('generic-4');
      expect(food.foodex2Id).toBe(CONCEPT_ROW.termId);
    });

    it('stays a superset of the generic-food response', async () => {
      const [food] = (await service.search({ search: 'pasta' })).items;

      // Fields a client of GET /generic-foods already reads.
      expect(food.nevoCode).toBe(4);
      expect(food.foodGroup).toBe('Cereals and cereal products');
      expect(food.foodGroupSlug).toBe('cereals-and-cereal-products');
      expect(food.vegan).toBe(true);
      expect(food.vegetarian).toBe(true);
      expect(food.meatOrFish).toBe(false);
    });

    it('paginates using the project’s conventions', async () => {
      repository.search.mockResolvedValue({ rows: [CONCEPT_ROW], total: 45 });

      const result = await service.search({
        search: 'pasta',
        page: 2,
        limit: 20,
      });

      expect(repository.search).toHaveBeenCalledWith({
        search: 'pasta',
        coreOnly: undefined,
        locale: 'en',
        skip: 20,
        take: 20,
      });
      expect(result).toMatchObject({
        total: 45,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
    });

    it('drops a concept whose canonical NEVO record disappeared mid-request', async () => {
      repository.findGenericFoodsByNevoCodes.mockResolvedValue(new Map());

      const result = await service.search({ search: 'pasta' });

      expect(result.items).toEqual([]);
    });
  });

  describe('findByFoodex2Code', () => {
    it('resolves a FoodEx2 code to its canonical NEVO nutrients', async () => {
      repository.findByCode.mockResolvedValue(CONCEPT_ROW);
      repository.findGenericFoodsByNevoCodes.mockResolvedValue(
        new Map([[4, NEVO_PASTA_DRY]]),
      );

      const food = await service.findByFoodex2Code('A007L');

      expect(food.foodex2Code).toBe('A007L');
      expect(food.energyKcal).toBe(361);
    });

    it('throws when the code has no canonical NEVO record', async () => {
      repository.findByCode.mockResolvedValue(null);

      await expect(service.findByFoodex2Code('A007G')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('localization', () => {
    it('passes the resolved locale to the repository', async () => {
      repository.search.mockResolvedValue({ rows: [], total: 0 });
      repository.findGenericFoodsByNevoCodes.mockResolvedValue(new Map());

      await service.search({ search: 'Nudeln', lang: 'de' });

      expect(mockTranslationService.resolveLocale).toHaveBeenCalledWith('de');
      expect(repository.search).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Nudeln', locale: 'de' }),
      );
    });

    it('returns the localized name alongside the English one', async () => {
      repository.search.mockResolvedValue({
        rows: [{ ...CONCEPT_ROW, name: 'Getrocknete Nudeln' }],
        total: 1,
      });
      repository.findGenericFoodsByNevoCodes.mockResolvedValue(
        new Map([[4, NEVO_PASTA_DRY]]),
      );

      const [food] = (await service.search({ search: 'Nudeln', lang: 'de' }))
        .items;

      expect(food.foodName).toBe('Getrocknete Nudeln');
      // Clients can always fall back on the canonical English name.
      expect(food.nameEn).toBe('Dried pasta');
    });

    it('forwards the locale when resolving a single code', async () => {
      repository.findByCode.mockResolvedValue(CONCEPT_ROW);
      repository.findGenericFoodsByNevoCodes.mockResolvedValue(
        new Map([[4, NEVO_PASTA_DRY]]),
      );

      await service.findByFoodex2Code('A007L', 'de');

      expect(repository.findByCode).toHaveBeenCalledWith('A007L', 'de');
    });
  });
});
