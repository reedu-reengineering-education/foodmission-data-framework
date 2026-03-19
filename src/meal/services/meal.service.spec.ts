import { Test, TestingModule } from '@nestjs/testing';
import { MealService } from './meal.service';
import { MealRepository } from '../repositories/meal.repository';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('MealService', () => {
  let service: MealService;
  const userId = 'user-1';

  const mockMealRepository = {
    findByBarcode: jest.fn(),
    create: jest.fn(),
    findWithPagination: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealService,
        { provide: MealRepository, useValue: mockMealRepository },
      ],
    }).compile();

    service = module.get<MealService>(MealService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw ConflictException when barcode already exists', async () => {
    mockMealRepository.findByBarcode.mockResolvedValue({ id: 'm1' });

    await expect(
      service.create(
        {
          name: 'Meal',
          barcode: '111',
        },
        userId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should create meal when data valid', async () => {
    const meal = {
      id: 'm1',
      name: 'Meal',
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockMealRepository.findByBarcode.mockResolvedValue(null);
    mockMealRepository.create.mockResolvedValue(meal);

    const result = await service.create({ name: 'Meal' }, userId);

    expect(result.id).toBe('m1');
    expect(mockMealRepository.create).toHaveBeenCalledWith({
      name: 'Meal',
      userId,
    });
  });

  it('should enforce ownership on update', async () => {
    const meal = {
      id: 'm1',
      name: 'Meal',
      userId: 'other',
    };
    mockMealRepository.findById.mockResolvedValue(meal);

    await expect(service.update('m1', { name: 'New' }, userId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw NotFound when meal missing on update', async () => {
    mockMealRepository.findById.mockResolvedValue(null);

    await expect(
      service.update('missing', { name: 'New' }, userId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should build filters for findAll', async () => {
    const paginationResult = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };
    mockMealRepository.findWithPagination.mockResolvedValue(paginationResult);

    await service.findAll(userId, {
      recipeId: 'recipe-1',
      search: 'chick',
      page: 2,
      limit: 5,
    });

    expect(mockMealRepository.findWithPagination).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      where: {
        userId,
        recipeId: 'recipe-1',
        name: { contains: 'chick', mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should build taxonomy filters for findAll', async () => {
    const paginationResult = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };
    mockMealRepository.findWithPagination.mockResolvedValue(paginationResult);

    await service.findAll(userId, {
      mealCategory: 'MEAT' as any,
      mealCourse: 'MAIN' as any,
      dietaryLabel: 'GLUTEN_FREE' as any,
      page: 1,
      limit: 10,
    });

    expect(mockMealRepository.findWithPagination).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
      where: {
        userId,
        mealCategories: { has: 'MEAT' },
        mealCourse: 'MAIN',
        dietaryLabels: { has: 'GLUTEN_FREE' },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  // === Tests for revised database relations ===

  describe('Meal-Recipe relation (Meal optionally references Recipe)', () => {
    it('should create meal with optional recipeId link', async () => {
      const meal = {
        id: 'm1',
        name: 'Teriyaki Lunch',
        recipeId: 'recipe-1',
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockMealRepository.findByBarcode.mockResolvedValue(null);
      mockMealRepository.create.mockResolvedValue(meal);

      const result = await service.create(
        { name: 'Teriyaki Lunch', recipeId: 'recipe-1' },
        userId,
      );

      expect(result.id).toBe('m1');
      expect(mockMealRepository.create).toHaveBeenCalledWith({
        name: 'Teriyaki Lunch',
        recipeId: 'recipe-1',
        userId,
      });
    });

    it('should create meal without recipeId (not based on any recipe)', async () => {
      const meal = {
        id: 'm1',
        name: 'Quick Snack',
        recipeId: null,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockMealRepository.findByBarcode.mockResolvedValue(null);
      mockMealRepository.create.mockResolvedValue(meal);

      const result = await service.create({ name: 'Quick Snack' }, userId);

      expect(result.id).toBe('m1');
      expect(mockMealRepository.create).toHaveBeenCalledWith({
        name: 'Quick Snack',
        userId,
      });
    });

    it('should filter meals by recipeId', async () => {
      const paginationResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      mockMealRepository.findWithPagination.mockResolvedValue(paginationResult);

      await service.findAll(userId, {
        recipeId: 'recipe-xyz',
        page: 1,
        limit: 10,
      });

      expect(mockMealRepository.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ recipeId: 'recipe-xyz' }),
        }),
      );
    });
  });

  describe('MealType removal (no longer on Meal model)', () => {
    it('should create meal without mealType field (removed from schema)', async () => {
      const meal = {
        id: 'm1',
        name: 'Dinner Meal',
        userId,
        // Note: no mealType field - it was removed from Meal model
        // Dish category is now on Recipe.category instead
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockMealRepository.findByBarcode.mockResolvedValue(null);
      mockMealRepository.create.mockResolvedValue(meal);

      const result = await service.create({ name: 'Dinner Meal' }, userId);

      expect(result.id).toBe('m1');
      // Verify no mealType is passed to repository
      expect(mockMealRepository.create).toHaveBeenCalledWith({
        name: 'Dinner Meal',
        userId,
      });
    });
  });
});
