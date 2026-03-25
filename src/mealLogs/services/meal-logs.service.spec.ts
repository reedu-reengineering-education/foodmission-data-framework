import { Test, TestingModule } from '@nestjs/testing';
import { MealLogsService } from './meal-logs.service';
import { MealLogsRepository } from '../repositories/meal-logs.repository';
import { MealsRepository } from '../../meals/repositories/meals.repository';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TypeOfMeal } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
} from '../../common/exceptions/business.exception';

describe('MealLogsService', () => {
  let service: MealLogsService;
  const userId = 'user-1';

  const mockMealLogRepository = {
    create: jest.fn(),
    findWithPagination: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockMealRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealLogsService,
        { provide: MealLogsRepository, useValue: mockMealLogRepository },
        { provide: MealsRepository, useValue: mockMealRepository },
      ],
    }).compile();

    service = module.get<MealLogsService>(MealLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw when meal missing on create', async () => {
    mockMealRepository.findById.mockResolvedValue(null);

    await expect(
      service.create({ mealId: 'm1', typeOfMeal: TypeOfMeal.LUNCH }, userId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should enforce ownership on create', async () => {
    mockMealRepository.findById.mockResolvedValue({
      id: 'm1',
      userId: 'other',
    });
    await expect(
      service.create({ mealId: 'm1', typeOfMeal: TypeOfMeal.LUNCH }, userId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should create meal log when authorized', async () => {
    const mealLog = {
      id: 'm1',
      mealId: 'm1',
      userId,
      typeOfMeal: TypeOfMeal.LUNCH,
      eatenOut: false,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockMealRepository.findById.mockResolvedValue({
      id: 'm1',
      userId,
      pantryItemId: null,
    });
    mockMealLogRepository.create.mockResolvedValue(mealLog);

    const result = await service.create(
      { mealId: 'm1', typeOfMeal: TypeOfMeal.LUNCH },
      userId,
    );

    expect(result.id).toBe('m1');
    expect(mockMealLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mealId: 'm1',
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

  it('should default mealFromPantry to false when not provided', async () => {
    const mealLog = { id: 'm1', userId, mealId: 'm1' };
    mockMealRepository.findById.mockResolvedValue({
      id: 'm1',
      userId,
    });
    mockMealLogRepository.create.mockResolvedValue(mealLog as any);

    await service.create(
      { mealId: 'm1', typeOfMeal: TypeOfMeal.BREAKFAST },
      userId,
    );

    expect(mockMealLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ mealFromPantry: false }),
    );
  });

  it('should map Prisma unique error to ResourceAlreadyExistsException on create', async () => {
    mockMealRepository.findById.mockResolvedValue({ id: 'm1', userId });
    mockMealLogRepository.create.mockRejectedValue(
      new PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: '4.0.0',
        meta: { target: ['mealId'] },
      } as any),
    );

    await expect(
      service.create(
        { mealId: 'm1', typeOfMeal: TypeOfMeal.BREAKFAST },
        userId,
      ),
    ).rejects.toBeInstanceOf(ResourceAlreadyExistsException);
  });

  it('should map Prisma not found error to ResourceNotFoundException on update', async () => {
    mockMealLogRepository.findById.mockResolvedValue({
      id: 'log-1',
      userId,
      mealId: 'm1',
    });
    mockMealLogRepository.update.mockRejectedValue(
      new PrismaClientKnownRequestError('missing', {
        code: 'P2025',
        clientVersion: '4.0.0',
      } as any),
    );

    await expect(
      service.update('log-1', { typeOfMeal: TypeOfMeal.LUNCH }, userId),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('should build filters for findAll including dates', async () => {
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
      },
      orderBy: { timestamp: 'desc' },
      include: { meal: true },
    });
  });
});
