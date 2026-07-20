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
    getAllFoodGroups: jest.fn(),
  };

  const mockTranslationMethods = {
    resolveLocale: jest.fn((lang?: string) => lang ?? 'en'),
    resolveMany: jest.fn(),
    findEntityIdsByValue: jest.fn(),
    listDistinct: jest.fn(),
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
      expect(result).toEqual(mockCategory);
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
    });

    it('should search localized names when lang is set', async () => {
      const query: GenericFoodQueryDto = {
        search: 'tomaat',
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
        ['foodName', 'synonym'],
        'tomaat',
      );
      expect(repository.findAll).toHaveBeenCalledWith(query, {
        localizedSearchIds: ['generic-123'],
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
        'equals',
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
    it('should return English groups by default', async () => {
      translations.resolveLocale.mockReturnValue('en');
      repository.getAllFoodGroups.mockResolvedValue(['Vegetables']);

      const result = await service.getAllFoodGroups();

      expect(repository.getAllFoodGroups).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(['Vegetables']);
    });

    it('should return localized groups when available', async () => {
      translations.resolveLocale.mockReturnValue('nl');
      translations.listDistinct.mockResolvedValue(['Groenten']);

      const result = await service.getAllFoodGroups(undefined, 'nl');

      expect(translations.listDistinct).toHaveBeenCalledWith(
        'GenericFood',
        'nl',
        'foodGroup',
        undefined,
      );
      expect(result).toEqual(['Groenten']);
    });
  });
});
