import { Test, TestingModule } from '@nestjs/testing';
import { MealLogService } from './meal-log.service';
import { MealLogRepository } from '../repositories/meal-log.repository';
import { DishRepository } from '../../dish/repositories/dish.repository';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TypeOfMeal } from '@prisma/client';

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
});
