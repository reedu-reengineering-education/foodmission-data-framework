import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MealLogService } from './meal-log.service';
import { MealLogRepository } from '../repositories/meal-log.repository';
import { MealRepository } from '../../meal/repositories/meal.repository';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MealType, TypeOfMeal } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
} from '../../common/exceptions/business.exception';

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

  const mockMealRepository = {
    findById: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealLogService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: MealLogRepository, useValue: mockMealLogRepository },
        { provide: MealRepository, useValue: mockMealRepository },
      ],
    }).compile();

    service = module.get<MealLogService>(MealLogService);
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
      mealFromPantry: false,
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

  it('should infer mealFromPantry from meal link when not provided', async () => {
    const mealLog = { id: 'm1', userId, mealId: 'm1' };
    mockMealRepository.findById.mockResolvedValue({
      id: 'm1',
      userId,
      pantryItemId: 'pi-1',
    });
    mockMealLogRepository.create.mockResolvedValue(mealLog as any);

    await service.create(
      { mealId: 'm1', typeOfMeal: TypeOfMeal.BREAKFAST },
      userId,
    );

    expect(mockMealLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ mealFromPantry: true }),
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
        meal: { mealType: MealType.MEAT },
      },
      orderBy: { timestamp: 'desc' },
      include: { meal: true },
    });
  });

  describe('Caching', () => {
    it('should cache findAll results and return cached data on second call', async () => {
      const query = { page: 1, limit: 10 };
      const paginationResult = {
        data: [
          { id: 'log1', userId, mealId: 'm1', typeOfMeal: TypeOfMeal.LUNCH },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockCacheManager.get.mockResolvedValueOnce(null); // Cache miss
      mockMealLogRepository.findWithPagination.mockResolvedValue(
        paginationResult,
      );

      // First call - should hit database
      await service.findAll(userId, query);

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        `meallog:list:${userId}:${JSON.stringify(query)}`,
      );
      expect(mockMealLogRepository.findWithPagination).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `meallog:list:${userId}:${JSON.stringify(query)}`,
        expect.any(Object),
        300000, // 5 minutes
      );

      // Reset mocks for second call
      jest.clearAllMocks();
      mockCacheManager.get.mockResolvedValueOnce(paginationResult); // Cache hit

      // Second call - should use cache
      const result = await service.findAll(userId, query);

      expect(mockCacheManager.get).toHaveBeenCalledTimes(1);
      expect(mockMealLogRepository.findWithPagination).not.toHaveBeenCalled();
      expect(result).toEqual(paginationResult);
    });

    it('should cache findOne results', async () => {
      const logId = 'log-123';
      const mealLog = {
        id: logId,
        userId,
        mealId: 'm1',
        typeOfMeal: TypeOfMeal.DINNER,
      };

      mockCacheManager.get.mockResolvedValueOnce(null); // Cache miss
      mockMealLogRepository.findById.mockResolvedValue(mealLog);

      // First call - should hit database
      await service.findOne(logId, userId);

      expect(mockCacheManager.get).toHaveBeenCalledWith(`meallog:${logId}`);
      expect(mockMealLogRepository.findById).toHaveBeenCalledWith(logId);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `meallog:${logId}`,
        expect.any(Object),
        900000, // 15 minutes
      );
    });

    it('should verify ownership even with cached data in findOne', async () => {
      const logId = 'log-123';
      const cachedLog = { id: logId, userId: 'different-user', mealId: 'm1' };

      mockCacheManager.get.mockResolvedValueOnce(cachedLog); // Cache hit with different user
      mockMealLogRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(logId, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockMealLogRepository.findById).toHaveBeenCalledWith(logId);
    });

    it('should invalidate cache on create', async () => {
      const meal = { id: 'm1', userId, pantryItemId: null };
      const createDto = { mealId: 'm1', typeOfMeal: TypeOfMeal.BREAKFAST };
      const createdLog = { id: 'log1', userId, ...createDto };

      mockMealRepository.findById.mockResolvedValue(meal);
      mockMealLogRepository.create.mockResolvedValue(createdLog);

      await service.create(createDto, userId);

      // Should invalidate common cache patterns
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `meallog:list:${userId}:{}`,
      );
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `meallog:list:${userId}:{"page":1,"limit":10}`,
      );
    });

    it('should invalidate cache on update', async () => {
      const logId = 'log-123';
      const mealLog = {
        id: logId,
        userId,
        mealId: 'm1',
        typeOfMeal: TypeOfMeal.LUNCH,
      };
      const updateDto = { typeOfMeal: TypeOfMeal.DINNER };
      const updatedLog = { ...mealLog, ...updateDto };

      mockMealLogRepository.findById.mockResolvedValue(mealLog);
      mockMealLogRepository.update.mockResolvedValue(updatedLog);

      await service.update(logId, updateDto, userId);

      // Should delete specific log cache
      expect(mockCacheManager.del).toHaveBeenCalledWith(`meallog:${logId}`);
      // Should invalidate list cache
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `meallog:list:${userId}:{}`,
      );
    });

    it('should invalidate cache on delete', async () => {
      const logId = 'log-123';
      const mealLog = { id: logId, userId, mealId: 'm1' };

      mockMealLogRepository.findById.mockResolvedValue(mealLog);
      mockMealLogRepository.delete.mockResolvedValue(undefined);

      await service.remove(logId, userId);

      // Should delete specific log cache
      expect(mockCacheManager.del).toHaveBeenCalledWith(`meallog:${logId}`);
      // Should invalidate list cache
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `meallog:list:${userId}:{}`,
      );
    });

    it('should use correct TTL for list cache', async () => {
      const query = { page: 1, limit: 5 };
      const paginationResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      };

      mockCacheManager.get.mockResolvedValueOnce(null);
      mockMealLogRepository.findWithPagination.mockResolvedValue(
        paginationResult,
      );

      await service.findAll(userId, query);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        300000, // 5 minutes = 300000ms
      );
    });

    it('should use correct TTL for individual log cache', async () => {
      const logId = 'log-123';
      const mealLog = { id: logId, userId, mealId: 'm1' };

      mockCacheManager.get.mockResolvedValueOnce(null);
      mockMealLogRepository.findById.mockResolvedValue(mealLog);

      await service.findOne(logId, userId);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        900000, // 15 minutes = 900000ms
      );
    });
  });
});
