import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';
import { MealLogRepository } from '../repositories/meal-log.repository';
import { MealRepository } from '../../meal/repositories/meal.repository';
import { CreateMealLogDto } from '../dto/create-meal-log.dto';
import { UpdateMealLogDto } from '../dto/update-meal-log.dto';
import {
  MealLogResponseDto,
  MultipleMealLogResponseDto,
} from '../dto/meal-log-response.dto';
import { QueryMealLogDto } from '../dto/query-meal-log.dto';
import { Prisma } from '@prisma/client';
import { getOwnedEntityOrThrow } from '../../common/services/ownership-helpers';
import { handlePrismaError } from '../../common/utils/error.utils';

@Injectable()
export class MealLogService {
  private readonly logger = new Logger(MealLogService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly mealLogRepository: MealLogRepository,
    private readonly mealRepository: MealRepository,
  ) {}

  private getOwnedMealOrThrow(mealId: string, userId: string) {
    return getOwnedEntityOrThrow(
      mealId,
      userId,
      (id) => this.mealRepository.findById(id),
      (d) => d.userId,
      'Meal not found',
    );
  }

  private getOwnedMealLogOrThrow(logId: string, userId: string) {
    return getOwnedEntityOrThrow(
      logId,
      userId,
      (id) => this.mealLogRepository.findById(id),
      (log) => log.userId,
      'Meal log not found',
    );
  }

  async create(
    createMealLogDto: CreateMealLogDto,
    userId: string,
  ): Promise<MealLogResponseDto> {
    const meal = await this.getOwnedMealOrThrow(
      createMealLogDto.mealId,
      userId,
    );

    const mealFromPantry =
      createMealLogDto.mealFromPantry ?? Boolean(meal.pantryItemId);

    try {
      const mealLog = await this.mealLogRepository.create({
        ...createMealLogDto,
        userId,
        mealFromPantry,
        timestamp: createMealLogDto.timestamp
          ? new Date(createMealLogDto.timestamp)
          : undefined,
      });

      // Invalidate list cache for this user
      await this.invalidateUserListCache(userId);

      return this.toResponse(mealLog);
    } catch (error) {
      throw handlePrismaError(error, 'create meal log', 'MealLog');
    }
  }

  async findAll(
    userId: string,
    query: QueryMealLogDto,
  ): Promise<MultipleMealLogResponseDto> {
    const {
      page = 1,
      limit = 10,
      dateFrom,
      dateTo,
      typeOfMeal,
      mealType,
      mealFromPantry,
      eatenOut,
    } = query;
    const skip = (page - 1) * limit;

    // Sort query keys for consistent cache keys
    const sortedQuery = Object.keys(query)
      .sort()
      .reduce((obj, key) => {
        obj[key] = query[key];
        return obj;
      }, {} as QueryMealLogDto);

    // Generate cache key based on query parameters
    const cacheKey = `meallog:list:${userId}:${JSON.stringify(sortedQuery)}`;

    // Try to get from cache first
    const cached =
      await this.cacheManager.get<MultipleMealLogResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for meal log list: ${cacheKey}`);
      return cached;
    }

    const where: Prisma.MealLogWhereInput = {
      userId,
      ...(typeOfMeal ? { typeOfMeal } : {}),
      ...(mealFromPantry !== undefined ? { mealFromPantry } : {}),
      ...(eatenOut !== undefined ? { eatenOut } : {}),
      ...(dateFrom || dateTo
        ? {
            timestamp: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(mealType
        ? {
            meal: {
              mealType,
            },
          }
        : {}),
    };

    try {
      const result = await this.mealLogRepository.findWithPagination({
        skip,
        take: limit,
        where,
        orderBy: { timestamp: 'desc' },
        include: { meal: true },
      });

      const response = plainToInstance(
        MultipleMealLogResponseDto,
        {
          data: result.data.map((log) => this.toResponse(log)),
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        { excludeExtraneousValues: true },
      );

      // Cache for 5 minutes (300000ms)
      await this.cacheManager.set(cacheKey, response, 300000);
      this.logger.debug(`Cached meal log list: ${cacheKey}`);

      return response;
    } catch (error) {
      throw handlePrismaError(error, 'find meal logs', 'MealLog');
    }
  }

  async findOne(id: string, userId: string): Promise<MealLogResponseDto> {
    const cacheKey = `meallog:${id}`;

    // Try to get from cache first
    const cached = await this.cacheManager.get<MealLogResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for meal log: ${cacheKey}`);
      // Verify ownership even with cached data
      if (cached.userId !== userId) {
        await this.getOwnedMealLogOrThrow(id, userId);
      }
      return cached;
    }

    const ownedMealLog = await this.getOwnedMealLogOrThrow(id, userId);
    const response = this.toResponse(ownedMealLog);

    // Cache for 15 minutes (900000ms)
    await this.cacheManager.set(cacheKey, response, 900000);
    this.logger.debug(`Cached meal log: ${cacheKey}`);

    return response;
  }

  async update(
    id: string,
    updateMealLogDto: UpdateMealLogDto,
    userId: string,
  ): Promise<MealLogResponseDto> {
    const mealLog = await this.getOwnedMealLogOrThrow(id, userId);

    if (updateMealLogDto.mealId && updateMealLogDto.mealId !== mealLog.mealId) {
      await this.getOwnedMealOrThrow(updateMealLogDto.mealId, userId);
    }

    try {
      const updated = await this.mealLogRepository.update(id, {
        ...updateMealLogDto,
        timestamp: updateMealLogDto.timestamp
          ? new Date(updateMealLogDto.timestamp)
          : undefined,
      });

      // Invalidate caches
      await this.cacheManager.del(`meallog:${id}`);
      await this.invalidateUserListCache(userId);

      return this.toResponse(updated);
    } catch (error) {
      throw handlePrismaError(error, 'update meal log', 'MealLog');
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getOwnedMealLogOrThrow(id, userId);
    try {
      await this.mealLogRepository.delete(id);

      // Invalidate caches
      await this.cacheManager.del(`meallog:${id}`);
      await this.invalidateUserListCache(userId);
    } catch (error) {
      throw handlePrismaError(error, 'delete meal log', 'MealLog');
    }
  }

  private toResponse(log: any): MealLogResponseDto {
    return plainToInstance(MealLogResponseDto, log, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Invalidate all list cache entries for a specific user
   * Cache keys follow pattern: meallog:list:{userId}:*
   *
   * LIMITATION: Pattern-based cache deletion (SCAN + DEL) requires Redis-specific
   * implementation. To maintain compatibility with any cache backend, we only clear
   * common query patterns. Uncommon query combinations may serve stale data for up
   * to 5 minutes (list cache TTL) after mutations.
   *
   * For Redis-specific implementation, consider using:
   * - ioredis with SCAN command
   * - cache-manager-redis-store with pattern deletion support
   */
  private async invalidateUserListCache(userId: string): Promise<void> {
    try {
      // Note: Pattern-based deletion requires Redis-specific implementation
      // For now, we'll log and accept that some stale cache entries may exist
      // until they expire naturally (5 minutes TTL)
      this.logger.debug(
        `User ${userId} list cache will be invalidated on next access or after 5min TTL`,
      );

      // Alternative approach: Clear known common query patterns
      // This is more limited but works with any cache backend
      const commonPatterns = [
        `meallog:list:${userId}:{}`, // Default query
        `meallog:list:${userId}:{"page":1,"limit":10}`, // Common pagination
      ];

      await Promise.all(
        commonPatterns.map((key) => this.cacheManager.del(key)),
      );
    } catch (error) {
      this.logger.error(
        `Failed to invalidate list cache for user ${userId}:`,
        error,
      );
    }
  }
}
