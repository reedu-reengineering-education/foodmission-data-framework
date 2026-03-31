import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FoodCategoriesService } from './food-categories.service';
import { FoodCategoriesRepository } from '../repositories/food-categories.repository';
import { CreateFoodCategoryDto } from '../dto/create-food-category.dto';
import { UpdateFoodCategoryDto } from '../dto/update-food-category.dto';
import { FoodCategoryQueryDto } from '../dto/food-category-query.dto';
import { TEST_FOOD_CATEGORY } from '../../../test/fixtures/food.fixtures';

describe('FoodCategoriesService', () => {
  let service: FoodCategoriesService;
  let repository: jest.Mocked<FoodCategoriesRepository>;

  // Simplified mock - cast as any to avoid listing all 100+ Prisma fields
  const mockCategory: any = { ...TEST_FOOD_CATEGORY, id: 'cat-123' };

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
        FoodCategoriesService,
        {
          provide: FoodCategoriesRepository,
          useValue: mockRepositoryMethods,
        },
      ],
    }).compile();

    service = module.get<FoodCategoriesService>(FoodCategoriesService);
    repository = module.get(FoodCategoriesRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a food category', async () => {
      const createDto: CreateFoodCategoryDto = {
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

    it('should create a category with nutritional data', async () => {
      const createDto: CreateFoodCategoryDto = {
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
    it('should return paginated food categories', async () => {
      const query: FoodCategoryQueryDto = {
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
      const query: FoodCategoryQueryDto = {
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
      const query: FoodCategoryQueryDto = {
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
      const query: FoodCategoryQueryDto = {
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
    it('should return a food category by id', async () => {
      repository.findById.mockResolvedValue(mockCategory);

      const result = await service.findById('cat-123');

      expect(repository.findById).toHaveBeenCalledWith('cat-123');
      expect(result).toEqual(mockCategory);
      expect(result.id).toBe('cat-123');
    });

    it('should throw NotFoundException when category not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('invalid-id')).rejects.toThrow(
        "Food category with ID 'invalid-id' not found",
      );
    });
  });

  describe('update', () => {
    it('should update a food category', async () => {
      const updateDto: UpdateFoodCategoryDto = {
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

      const result = await service.update('cat-123', updateDto);

      expect(repository.findById).toHaveBeenCalledWith('cat-123');
      expect(repository.update).toHaveBeenCalledWith('cat-123', updateDto);
      expect(result.foodName).toBe('Tomato, cooked');
      expect(result.energyKcal).toBe(20);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      const updateDto: UpdateFoodCategoryDto = {
        foodName: 'New name',
      };

      repository.findById.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should update only provided fields', async () => {
      const updateDto: UpdateFoodCategoryDto = {
        energyKcal: 25,
      };

      const updatedCategory = {
        ...mockCategory,
        energyKcal: 25,
      };

      repository.findById.mockResolvedValue(mockCategory);
      repository.update.mockResolvedValue(updatedCategory);

      const result = await service.update('cat-123', updateDto);

      expect(result.foodName).toBe(mockCategory.foodName); // Unchanged
      expect(result.energyKcal).toBe(25); // Updated
    });
  });

  describe('delete', () => {
    it('should delete a food category', async () => {
      repository.findById.mockResolvedValue(mockCategory);
      repository.delete.mockResolvedValue(mockCategory);

      await service.delete('cat-123');

      expect(repository.findById).toHaveBeenCalledWith('cat-123');
      expect(repository.delete).toHaveBeenCalledWith('cat-123');
    });

    it('should throw NotFoundException when category does not exist', async () => {
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

    it('should return empty array when no categories exist', async () => {
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
