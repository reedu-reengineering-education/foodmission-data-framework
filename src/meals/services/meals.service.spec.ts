import { Test, TestingModule } from '@nestjs/testing';
import { MealsService } from './meals.service';
import { MealsRepository } from '../repositories/meals.repository';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('MealsService', () => {
  let service: MealsService;
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
        MealsService,
        { provide: MealsRepository, useValue: mockMealRepository },
      ],
    }).compile();

    service = module.get<MealsService>(MealsService);
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

  it('should throw ConflictException on update when new barcode already exists', async () => {
    mockMealRepository.findById.mockResolvedValue({
      id: 'm1',
      name: 'Meal',
      userId,
      barcode: '111',
    });
    mockMealRepository.findByBarcode.mockResolvedValue({ id: 'other-meal' });

    await expect(
      service.update('m1', { barcode: '222' }, userId),
    ).rejects.toThrow(ConflictException);
  });

  it('should allow update when barcode is unchanged', async () => {
    const updatedMeal = {
      id: 'm1',
      name: 'Updated Meal',
      userId,
      barcode: '111',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockMealRepository.findById.mockResolvedValue({
      id: 'm1',
      name: 'Meal',
      userId,
      barcode: '111',
    });
    mockMealRepository.update.mockResolvedValue(updatedMeal);

    const result = await service.update('m1', { name: 'Updated Meal' }, userId);

    expect(result.id).toBe('m1');
    expect(mockMealRepository.findByBarcode).not.toHaveBeenCalled();
    expect(mockMealRepository.update).toHaveBeenCalledWith('m1', {
      name: 'Updated Meal',
    });
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
      mealCategory: 'ANIMAL_PROTEIN' as any,
      mealCourse: 'MAIN_DISH' as any,
      dietaryPreference: 'VEGAN' as any,
      page: 1,
      limit: 10,
    });

    expect(mockMealRepository.findWithPagination).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
      where: {
        userId,
        mealCategories: { has: 'ANIMAL_PROTEIN' },
        mealCourse: 'MAIN_DISH',
        dietaryLabels: { has: 'VEGAN' },
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});
