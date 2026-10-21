import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GenericFoodService } from './generic-food.service';
import { GenericFoodRepository } from '../repositories/generic-food.repository';
import { GenericFoodQueryDto } from '../dto/generic-food-query.dto';
import { CreateGenericFoodDto } from '../dto/create-generic-food.dto';
import { UpdateGenericFoodDto } from '../dto/update-generic-food.dto';
import { TranslationService } from '../../translations/services/translation.service';
import { TEST_FOOD_CATEGORY } from '../../../test/fixtures/food.fixtures';

describe('GenericFoodService', () => {
  let service: GenericFoodService;
  let repository: jest.Mocked<GenericFoodRepository>;
  let translations: jest.Mocked<TranslationService>;

  const mockCategory: any = { ...TEST_FOOD_CATEGORY, id: 'generic-123' };

  const mockRepositoryMethods = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByNevoCode: jest.fn(),
    getDistinctFoodGroups: jest.fn(),
    findSearchCandidates: jest.fn(),
    filterIdsByFoodGroup: jest.fn(),
    findByIds: jest.fn(),
  };

  const mockTranslationMethods = {
    resolveLocale: jest.fn((lang?: string) => lang ?? 'en'),
    resolveMany: jest.fn(),
    findEntityIdsByValue: jest.fn(),
    deleteForEntity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenericFoodService,
        {
          provide: GenericFoodRepository,
          useValue: mockRepositoryMethods,
        },
        {
          provide: TranslationService,
          useValue: mockTranslationMethods,
        },
      ],
    }).compile();

    service = module.get<GenericFoodService>(GenericFoodService);
    repository = module.get(GenericFoodRepository);
    translations = module.get(TranslationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a generic food', async () => {
      const createDto: CreateGenericFoodDto = {
        nevoVersion: '2025',
        foodGroup: 'Vegetables',
        nevoCode: 1234,
        foodName: 'Tomato, raw',
        synonym: 'Fresh tomatoes',
        quantity: '100g',
      };

      repository.create.mockResolvedValue(mockCategory);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual({
        ...mockCategory,
        foodGroupSlug: 'vegetables',
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated generic foods with English fields', async () => {
      const query: GenericFoodQueryDto = {
        page: 1,
        limit: 20,
      };

      const paginatedResult = {
        items: [mockCategory],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      translations.resolveLocale.mockReturnValue('en');
      repository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll(query);

      expect(repository.findAll).toHaveBeenCalledWith(query, undefined);
      expect(result.items[0].foodName).toBe(mockCategory.foodName);
      expect(result.items[0].foodGroupSlug).toBe('vegetables');
      expect(result.items[0].remark).toBeNull();
    });

    it('should overlay Dutch translations when lang=nl', async () => {
      const query: GenericFoodQueryDto = { page: 1, limit: 20, lang: 'nl' };

      repository.findAll.mockResolvedValue({
        items: [mockCategory],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      translations.resolveLocale.mockReturnValue('nl');
      translations.resolveMany.mockResolvedValue({
        'generic-123': {
          foodName: 'Tomaat rauw',
          foodGroup: 'Groenten',
          remark: null,
          synonym: mockCategory.synonym,
        },
      });

      const result = await service.findAll(query);

      expect(result.items[0].foodName).toBe('Tomaat rauw');
      expect(result.items[0].foodGroup).toBe('Groenten');
      expect(result.items[0].foodGroupSlug).toBe('vegetables');
    });

    describe('with search', () => {
      const food = (id: string, nevoCode: number) => ({
        ...mockCategory,
        id,
        nevoCode,
        foodName: `Food ${id}`,
      });
      const candidate = (
        id: string,
        substringMatch = true,
        fields: {
          foodName?: string;
          foodGroup?: string;
          nevoCode?: number;
        } = {},
      ) => ({
        id,
        nevoCode: fields.nevoCode ?? 1,
        foodName: fields.foodName ?? `Food ${id}`,
        synonym: null,
        foodGroup: fields.foodGroup ?? 'Vegetables',
        translatedNames: [],
        substringMatch,
        score: 1,
      });

      beforeEach(() => {
        translations.resolveLocale.mockReturnValue('en');
      });

      it('returns the page in ranked order, not database order', async () => {
        repository.findSearchCandidates.mockResolvedValue([
          candidate('crisps', true, {
            foodName: 'Crisps potato av',
            foodGroup: 'Savoury snacks',
            nevoCode: 122,
          }),
          candidate('salad', true, {
            foodName: 'Salad potato',
            foodGroup: 'Mixed dishes',
            nevoCode: 5533,
          }),
          candidate('raw', true, {
            foodName: 'Potatoes raw',
            foodGroup: 'Potatoes and tubers',
            nevoCode: 1,
          }),
        ]);
        repository.findByIds.mockResolvedValue([
          food('crisps', 122),
          food('raw', 1),
        ]);

        const result = await service.findAll({
          search: ' potato ',
          page: 1,
          limit: 2,
        });

        expect(repository.findSearchCandidates).toHaveBeenCalledWith(
          'potato',
          'en',
        );
        expect(repository.findByIds).toHaveBeenCalledWith(['raw', 'crisps']);
        expect(result.items.map((item) => item.id)).toEqual(['raw', 'crisps']);
        expect(result).toMatchObject({
          total: 3,
          page: 1,
          limit: 2,
          totalPages: 2,
        });
        expect(repository.findAll).not.toHaveBeenCalled();
      });

      it('pages through the ranked ids', async () => {
        repository.findSearchCandidates.mockResolvedValue([
          candidate('a'),
          candidate('b'),
          candidate('c'),
        ]);
        repository.findByIds.mockResolvedValue([food('c', 3)]);

        const result = await service.findAll({
          search: 'pasta',
          page: 2,
          limit: 2,
        });

        expect(repository.findByIds).toHaveBeenCalledWith(['c']);
        expect(result.items.map((item) => item.id)).toEqual(['c']);
      });

      it('drops typo-only matches when there are substring matches', async () => {
        repository.findSearchCandidates.mockResolvedValue([
          candidate('real'),
          candidate('typo', false),
        ]);
        repository.findByIds.mockResolvedValue([food('real', 1)]);

        const result = await service.findAll({ search: 'pasta' });

        expect(repository.findByIds).toHaveBeenCalledWith(['real']);
        expect(result.total).toBe(1);
      });

      it('falls back to typo matches when nothing contains the term', async () => {
        repository.findSearchCandidates.mockResolvedValue([
          candidate('typo', false),
        ]);
        repository.findByIds.mockResolvedValue([food('typo', 1)]);

        const result = await service.findAll({ search: 'tomatos' });

        expect(result.total).toBe(1);
        expect(result.items[0].id).toBe('typo');
      });

      it('applies the food group filter to the ranked ids', async () => {
        translations.resolveLocale.mockReturnValue('nl');
        translations.findEntityIdsByValue.mockResolvedValue(['b']);
        translations.resolveMany.mockResolvedValue({});
        repository.findSearchCandidates.mockResolvedValue([
          candidate('a'),
          candidate('b'),
        ]);
        repository.filterIdsByFoodGroup.mockResolvedValue(['b']);
        repository.findByIds.mockResolvedValue([food('b', 2)]);

        const result = await service.findAll({
          search: 'appel',
          foodGroup: 'Fruit',
          lang: 'nl',
        });

        expect(repository.findSearchCandidates).toHaveBeenCalledWith(
          'appel',
          'nl',
        );
        expect(repository.filterIdsByFoodGroup).toHaveBeenCalledWith(
          ['a', 'b'],
          'Fruit',
          ['b'],
        );
        expect(result.items.map((item) => item.id)).toEqual(['b']);
        expect(result.total).toBe(1);
      });
    });

    it('should filter by localized food group when lang is set', async () => {
      const query: GenericFoodQueryDto = {
        foodGroup: 'Groenten',
        lang: 'nl',
        page: 1,
        limit: 20,
      };

      translations.resolveLocale.mockReturnValue('nl');
      translations.findEntityIdsByValue.mockResolvedValue(['generic-123']);
      repository.findAll.mockResolvedValue({
        items: [mockCategory],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      translations.resolveMany.mockResolvedValue({
        'generic-123': {
          foodName: 'Tomaat rauw',
          foodGroup: 'Groenten',
          remark: null,
          synonym: null,
        },
      });

      await service.findAll(query);

      expect(translations.findEntityIdsByValue).toHaveBeenCalledWith(
        'GenericFood',
        'nl',
        ['foodGroup'],
        'Groenten',
      );
      expect(repository.findAll).toHaveBeenCalledWith(query, {
        localizedFoodGroupIds: ['generic-123'],
      });
    });
  });

  describe('findById', () => {
    it('should return a generic food by id', async () => {
      repository.findById.mockResolvedValue(mockCategory);
      translations.resolveLocale.mockReturnValue('en');

      const result = await service.findById('generic-123');

      expect(repository.findById).toHaveBeenCalledWith('generic-123');
      expect(result.id).toBe('generic-123');
      expect(result.foodGroupSlug).toBe('vegetables');
      expect(result.remark).toBeNull();
    });

    it('should throw NotFoundException when generic food not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a generic food', async () => {
      const updateDto: UpdateGenericFoodDto = {
        foodName: 'Tomato, cooked',
        energyKcal: 20,
      };

      const updatedCategory = {
        ...mockCategory,
        foodName: 'Tomato, cooked',
        energyKcal: 20,
      };

      repository.findById.mockResolvedValue(mockCategory);
      translations.resolveLocale.mockReturnValue('en');
      repository.update.mockResolvedValue(updatedCategory);

      const result = await service.update('generic-123', updateDto);

      expect(repository.update).toHaveBeenCalledWith('generic-123', updateDto);
      expect(result.foodName).toBe('Tomato, cooked');
    });
  });

  describe('delete', () => {
    it('should delete translations then the generic food', async () => {
      repository.findById.mockResolvedValue(mockCategory);
      translations.resolveLocale.mockReturnValue('en');
      translations.deleteForEntity.mockResolvedValue(undefined);
      repository.delete.mockResolvedValue(mockCategory);

      await service.delete('generic-123');

      expect(translations.deleteForEntity).toHaveBeenCalledWith(
        'GenericFood',
        'generic-123',
      );
      expect(repository.delete).toHaveBeenCalledWith('generic-123');
    });
  });

  describe('getAllFoodGroups', () => {
    it('should return English groups with slugs by default', async () => {
      translations.resolveLocale.mockReturnValue('en');
      repository.getDistinctFoodGroups.mockResolvedValue([
        { foodGroup: 'Vegetables', sampleId: 'sample-1' },
        { foodGroup: 'Milk and milk products', sampleId: 'sample-2' },
      ]);

      const result = await service.getAllFoodGroups();

      expect(repository.getDistinctFoodGroups).toHaveBeenCalled();
      expect(result).toEqual([
        { slug: 'vegetables', name: 'Vegetables' },
        { slug: 'milk-and-milk-products', name: 'Milk and milk products' },
      ]);
    });

    it('should return localized names with English-derived slugs', async () => {
      translations.resolveLocale.mockReturnValue('nl');
      repository.getDistinctFoodGroups.mockResolvedValue([
        { foodGroup: 'Vegetables', sampleId: 'sample-1' },
      ]);
      translations.resolveMany.mockResolvedValue({
        'sample-1': { foodGroup: 'Groenten' },
      });

      const result = await service.getAllFoodGroups(undefined, 'nl');

      expect(translations.resolveMany).toHaveBeenCalledWith(
        'GenericFood',
        ['sample-1'],
        'nl',
        ['foodGroup'],
        { 'sample-1': { foodGroup: 'Vegetables' } },
      );
      expect(result).toEqual([{ slug: 'vegetables', name: 'Groenten' }]);
    });

    it('should filter by localized name when search is provided', async () => {
      translations.resolveLocale.mockReturnValue('nl');
      repository.getDistinctFoodGroups.mockResolvedValue([
        { foodGroup: 'Vegetables', sampleId: 'sample-1' },
        { foodGroup: 'Fruits', sampleId: 'sample-2' },
      ]);
      translations.resolveMany.mockResolvedValue({
        'sample-1': { foodGroup: 'Groenten' },
        'sample-2': { foodGroup: 'Fruit' },
      });

      const result = await service.getAllFoodGroups('groen', 'nl');

      expect(result).toEqual([{ slug: 'vegetables', name: 'Groenten' }]);
    });
  });
});
