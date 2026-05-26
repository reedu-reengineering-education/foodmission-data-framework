import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GenericFoodService } from './generic-food.service';
import { GenericFoodRepository } from '../repositories/generic-food.repository';
import { GenericFoodQueryDto } from '../dto/generic-food-query.dto';
import { CreateGenericFoodDto } from '../dto/create-generic-food.dto';
import { UpdateGenericFoodDto } from '../dto/update-generic-food.dto';

import { TEST_FOOD_CATEGORY } from '../../../test/fixtures/food.fixtures';

describe('GenericFoodService', () => {
  let service: GenericFoodService;
  let repository: jest.Mocked<GenericFoodRepository>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenericFoodService,
        {
          provide: GenericFoodRepository,
          useValue: mockRepositoryMethods,
        },
      ],
    }).compile();

    service = module.get<GenericFoodService>(GenericFoodService);
    repository = module.get(GenericFoodRepository);
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

    it('should create with nutritional fields', async () => {
      const createDto: CreateGenericFoodDto = {
        nevoVersion: '2025',
        foodGroup: 'Vegetables',
        nevoCode: 1234,
        foodName: 'Tomato, raw',
        energyKcal: 18,
        proteins: 0.9,
        fat: 0.2,
        carbohydrates: 3.9,
      };

      const categoryWithNutrients = {
        ...mockCategory,
        energyKcal: 18,
        proteins: 0.9,
        fat: 0.2,
        carbohydrates: 3.9,
      };

      repository.create.mockResolvedValue(categoryWithNutrients);

      const result = await service.create(createDto);

      expect(result.energyKcal).toBe(18);
      expect(result.proteins).toBe(0.9);
    });
  });

  describe('findAll', () => {
    it('should return paginated generic foods', async () => {
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

      repository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll(query);

      expect(repository.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginatedResult);
      expect(result.items).toHaveLength(1);
    });

    it('should handle search query', async () => {
      const query: GenericFoodQueryDto = {
        search: 'tomato',
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

      repository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll(query);

      expect(repository.findAll).toHaveBeenCalledWith(query);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].foodName).toContain('Tomato');
    });

    it('should filter by food group', async () => {
      const query: GenericFoodQueryDto = {
        foodGroup: 'Vegetables',
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

      repository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll(query);

      expect(repository.findAll).toHaveBeenCalledWith(query);
      expect(result.items[0].foodGroup).toBe('Vegetables');
    });

    it('should return empty array when no results found', async () => {
      const query: GenericFoodQueryDto = {
        search: 'nonexistent',
        page: 1,
        limit: 20,
      };

      repository.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const result = await service.findAll(query);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findById', () => {
    it('should return a generic food by id', async () => {
      repository.findById.mockResolvedValue(mockCategory);

      const result = await service.findById('generic-123');

      expect(repository.findById).toHaveBeenCalledWith('generic-123');
      expect(result).toEqual(mockCategory);
      expect(result.id).toBe('generic-123');
    });

    it('should throw NotFoundException when generic food not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('invalid-id')).rejects.toThrow(
        "Generic food with ID 'invalid-id' not found",
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
      repository.update.mockResolvedValue(updatedCategory);

      const result = await service.update('generic-123', updateDto);

      expect(repository.findById).toHaveBeenCalledWith('generic-123');
      expect(repository.update).toHaveBeenCalledWith('generic-123', updateDto);
      expect(result.foodName).toBe('Tomato, cooked');
      expect(result.energyKcal).toBe(20);
    });

    it('should throw NotFoundException when generic food does not exist', async () => {
      const updateDto: UpdateGenericFoodDto = {
        foodName: 'New name',
      };

      repository.findById.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should update only provided fields', async () => {
      const updateDto: UpdateGenericFoodDto = {
        energyKcal: 25,
      };

      const updatedCategory = {
        ...mockCategory,
        energyKcal: 25,
      };

      repository.findById.mockResolvedValue(mockCategory);
      repository.update.mockResolvedValue(updatedCategory);

      const result = await service.update('generic-123', updateDto);

      expect(result.foodName).toBe(mockCategory.foodName); // Unchanged
      expect(result.energyKcal).toBe(25); // Updated
    });
  });

  describe('delete', () => {
    it('should delete a generic food', async () => {
      repository.findById.mockResolvedValue(mockCategory);
      repository.delete.mockResolvedValue(mockCategory);

      await service.delete('generic-123');

      expect(repository.findById).toHaveBeenCalledWith('generic-123');
      expect(repository.delete).toHaveBeenCalledWith('generic-123');
    });

    it('should throw NotFoundException when generic food does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getAllFoodGroups', () => {
    it('should return all unique food groups', async () => {
      const foodGroups = ['Vegetables', 'Fruits', 'Grains', 'Dairy'];
      repository.getAllFoodGroups.mockResolvedValue(foodGroups);

      const result = await service.getAllFoodGroups();

      expect(repository.getAllFoodGroups).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(foodGroups);
      expect(result).toHaveLength(4);
    });

    it('should return filtered food groups when search is provided', async () => {
      const foodGroups = ['Vegetables', 'Vegetable oils'];
      repository.getAllFoodGroups.mockResolvedValue(foodGroups);

      const result = await service.getAllFoodGroups('vegeta');

      expect(repository.getAllFoodGroups).toHaveBeenCalledWith('vegeta');
      expect(result).toEqual(foodGroups);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no generic foods exist', async () => {
      repository.getAllFoodGroups.mockResolvedValue([]);

      const result = await service.getAllFoodGroups();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return sorted food groups', async () => {
      const foodGroups = [
        'Cereals and cereal products',
        'Dairy products',
        'Meat and meat products',
        'Vegetables',
      ];
      repository.getAllFoodGroups.mockResolvedValue(foodGroups);

      const result = await service.getAllFoodGroups();

      expect(result[0]).toBe('Cereals and cereal products');
      expect(result[result.length - 1]).toBe('Vegetables');
    });
  });
});
