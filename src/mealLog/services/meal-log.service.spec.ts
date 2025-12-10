import { Test, TestingModule } from '@nestjs/testing';
import { MealLogService } from './meal-log.service';
import { MealLogRepository } from '../repositories/meal-log.repository';
import { DishRepository } from '../../dish/repositories/dish.repository';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MealType, TypeOfMeal } from '@prisma/client';

describe('MealLogService', () => {
  let service: MealLogService;
  const userId = 'user-1';

  const mockMealLogRepository = {
    create: jest.fn(),
    findWithPagination: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockDishRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealLogService,
        { provide: MealLogRepository, useValue: mockMealLogRepository },
        { provide: DishRepository, useValue: mockDishRepository },
      ],
    }).compile();

    service = module.get<MealLogService>(MealLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw when dish missing on create', async () => {
    mockDishRepository.findById.mockResolvedValue(null);

    await expect(
      service.create({ dishId: 'd1', typeOfMeal: TypeOfMeal.LUNCH }, userId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should enforce ownership on create', async () => {
    mockDishRepository.findById.mockResolvedValue({
      id: 'd1',
      userId: 'other',
    });

    await expect(
      service.create({ dishId: 'd1', typeOfMeal: TypeOfMeal.LUNCH }, userId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should create meal log when authorized', async () => {
    const mealLog = {
      id: 'm1',
      dishId: 'd1',
      userId,
      typeOfMeal: TypeOfMeal.LUNCH,
      mealFromPantry: false,
      eatenOut: false,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDishRepository.findById.mockResolvedValue({
      id: 'd1',
      userId,
      pantryItemId: null,
    });
    mockMealLogRepository.create.mockResolvedValue(mealLog);

    const result = await service.create(
      { dishId: 'd1', typeOfMeal: TypeOfMeal.LUNCH },
      userId,
    );

    expect(result.id).toBe('m1');
    expect(mockMealLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dishId: 'd1',
        userId,
        typeOfMeal: TypeOfMeal.LUNCH,
      }),
    );
  });

  it('should forbid delete when owner differs', async () => {
    mockMealLogRepository.findById.mockResolvedValue({
      id: 'm1',
      userId: 'other',
    });

    await expect(service.remove('m1', userId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should infer mealFromPantry from dish link when not provided', async () => {
    const mealLog = { id: 'm1', userId, dishId: 'd1' };
    mockDishRepository.findById.mockResolvedValue({
      id: 'd1',
      userId,
      pantryItemId: 'pi-1',
    });
    mockMealLogRepository.create.mockResolvedValue(mealLog as any);

    await service.create(
      { dishId: 'd1', typeOfMeal: TypeOfMeal.BREAKFAST },
      userId,
    );

    expect(mockMealLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ mealFromPantry: true }),
    );
  });

  it('should build filters for findAll including dates and nested mealType', async () => {
    const paginationResult = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };
    mockMealLogRepository.findWithPagination.mockResolvedValue(
      paginationResult,
    );

    await service.findAll(userId, {
      dateFrom: '2025-01-01T00:00:00.000Z',
      dateTo: '2025-01-31T00:00:00.000Z',
      typeOfMeal: TypeOfMeal.LUNCH,
      mealType: MealType.MEAT,
      mealFromPantry: true,
      eatenOut: false,
      page: 2,
      limit: 5,
    } as any);

    expect(mockMealLogRepository.findWithPagination).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      where: {
        userId,
        typeOfMeal: TypeOfMeal.LUNCH,
        mealFromPantry: true,
        eatenOut: false,
        timestamp: {
          gte: new Date('2025-01-01T00:00:00.000Z'),
          lte: new Date('2025-01-31T00:00:00.000Z'),
        },
        dish: { mealType: MealType.MEAT },
      },
      orderBy: { timestamp: 'desc' },
      include: { dish: true },
    });
  });
});
