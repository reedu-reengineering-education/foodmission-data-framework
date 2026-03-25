import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { FoodCategoryController } from './food-categories.controller';
import { FoodCategoryService } from '../services/food-category.service';
import { TEST_FOOD_CATEGORY } from '../../../test/fixtures/food.fixtures';
import { CreateFoodCategoryDto } from '../dto/create-food-category.dto';
import { UpdateFoodCategoryDto } from '../dto/update-food-category.dto';
import { FoodCategoryQueryDto } from '../dto/food-category-query.dto';

describe('FoodCategoryController', () => {
  let controller: FoodCategoryController;
  let service: jest.Mocked<FoodCategoryService>;

  const mockCategory: any = { ...TEST_FOOD_CATEGORY, id: 'cat-123' };

  const mockServiceMethods = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getAllFoodGroups: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodCategoryController],
      providers: [
        {
          provide: FoodCategoryService,
          useValue: mockServiceMethods,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FoodCategoryController>(FoodCategoryController);
    service = module.get(FoodCategoryService);
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

      service.create.mockResolvedValue(mockCategory);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
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
      };

      service.create.mockResolvedValue(mockCategory);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result.energyKcal).toBe(18);
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

      service.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
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

      service.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result.items[0].foodName).toContain('Tomato');
    });

    it('should filter by food group', async () => {
      const query: FoodCategoryQueryDto = {
        foodGroup: 'Vegetables',
        page: 1,
        limit: 20,
      };

      service.findAll.mockResolvedValue({
        items: [mockCategory],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result.items[0].foodGroup).toBe('Vegetables');
    });

    it('should use default pagination values', async () => {
      const query: FoodCategoryQueryDto = {};

      service.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getAllFoodGroups', () => {
    it('should return all unique food groups', async () => {
      const foodGroups = ['Vegetables', 'Fruits', 'Grains', 'Dairy'];
      service.getAllFoodGroups.mockResolvedValue(foodGroups);

      const result = await controller.getAllFoodGroups();

      expect(service.getAllFoodGroups).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(foodGroups);
      expect(result).toHaveLength(4);
    });

    it('should return filtered food groups when search is provided', async () => {
      const foodGroups = ['Vegetables', 'Vegetable oils'];
      service.getAllFoodGroups.mockResolvedValue(foodGroups);

      const result = await controller.getAllFoodGroups('vegeta');

      expect(service.getAllFoodGroups).toHaveBeenCalledWith('vegeta');
      expect(result).toEqual(foodGroups);
    });

    it('should return empty array when no categories exist', async () => {
      service.getAllFoodGroups.mockResolvedValue([]);

      const result = await controller.getAllFoodGroups();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a food category by id', async () => {
      service.findById.mockResolvedValue(mockCategory);

      const result = await controller.findById('cat-123');

      expect(service.findById).toHaveBeenCalledWith('cat-123');
      expect(result).toEqual(mockCategory);
      expect(result.id).toBe('cat-123');
    });

    it('should throw NotFoundException when category not found', async () => {
      service.findById.mockRejectedValue(
        new NotFoundException("Food category with ID 'invalid-id' not found"),
      );

      await expect(controller.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
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

      service.update.mockResolvedValue(updatedCategory);

      const result = await controller.update('cat-123', updateDto);

      expect(service.update).toHaveBeenCalledWith('cat-123', updateDto);
      expect(result.foodName).toBe('Tomato, cooked');
      expect(result.energyKcal).toBe(20);
    });

    it('should update partial fields', async () => {
      const updateDto: UpdateFoodCategoryDto = {
        energyKcal: 25,
      };

      const updatedCategory = {
        ...mockCategory,
        energyKcal: 25,
      };

      service.update.mockResolvedValue(updatedCategory);

      const result = await controller.update('cat-123', updateDto);

      expect(service.update).toHaveBeenCalledWith('cat-123', updateDto);
      expect(result.energyKcal).toBe(25);
      expect(result.foodName).toBe(mockCategory.foodName);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      const updateDto: UpdateFoodCategoryDto = {
        foodName: 'New name',
      };

      service.update.mockRejectedValue(
        new NotFoundException("Food category with ID 'invalid-id' not found"),
      );

      await expect(controller.update('invalid-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a food category', async () => {
      service.delete.mockResolvedValue(undefined);

      await controller.delete('cat-123');

      expect(service.delete).toHaveBeenCalledWith('cat-123');
    });

    it('should throw NotFoundException when category does not exist', async () => {
      service.delete.mockRejectedValue(
        new NotFoundException("Food category with ID 'invalid-id' not found"),
      );

      await expect(controller.delete('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return void on successful deletion', async () => {
      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete('cat-123');

      expect(result).toBeUndefined();
    });
  });
});
