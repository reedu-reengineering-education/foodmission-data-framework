import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { MealLogRepository } from '../repositories/meal-log.repository';
import { DishRepository } from '../../dish/repositories/dish.repository';
import { CreateMealLogDto } from '../dto/create-meal-log.dto';
import { UpdateMealLogDto } from '../dto/update-meal-log.dto';
import {
  MealLogResponseDto,
  MultipleMealLogResponseDto,
} from '../dto/meal-log-response.dto';
import { QueryMealLogDto } from '../dto/query-meal-log.dto';
import { Prisma } from '@prisma/client';
import { getOwnedEntityOrThrow } from '../../common/services/ownership-helpers';

@Injectable()
export class MealLogService {
  private readonly logger = new Logger(MealLogService.name);

  constructor(
    private readonly mealLogRepository: MealLogRepository,
    private readonly dishRepository: DishRepository,
  ) {}

  private getOwnedDishOrThrow(dishId: string, userId: string) {
    return getOwnedEntityOrThrow(
      dishId,
      userId,
      (id) => this.dishRepository.findById(id),
      (d) => d.userId,
      'Dish not found',
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
    const dish = await this.getOwnedDishOrThrow(
      createMealLogDto.dishId,
      userId,
    );

    const mealFromPantry =
      createMealLogDto.mealFromPantry ?? Boolean(dish.pantryItemId);

    const mealLog = await this.mealLogRepository.create({
      ...createMealLogDto,
      userId,
      mealFromPantry,
      timestamp: createMealLogDto.timestamp
        ? new Date(createMealLogDto.timestamp)
        : undefined,
    });

    return this.toResponse(mealLog);
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
            dish: {
              mealType,
            },
          }
        : {}),
    };

    const result = await this.mealLogRepository.findWithPagination({
      skip,
      take: limit,
      where,
      orderBy: { timestamp: 'desc' },
      include: { dish: true },
    });

    return plainToInstance(
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
  }

  async findOne(id: string, userId: string): Promise<MealLogResponseDto> {
    const ownedMealLog = await this.getOwnedMealLogOrThrow(id, userId);
    return this.toResponse(ownedMealLog);
  }

  async update(
    id: string,
    updateMealLogDto: UpdateMealLogDto,
    userId: string,
  ): Promise<MealLogResponseDto> {
    const mealLog = await this.getOwnedMealLogOrThrow(id, userId);

    if (updateMealLogDto.dishId && updateMealLogDto.dishId !== mealLog.dishId) {
      await this.getOwnedDishOrThrow(updateMealLogDto.dishId, userId);
    }

    const updated = await this.mealLogRepository.update(id, {
      ...updateMealLogDto,
      timestamp: updateMealLogDto.timestamp
        ? new Date(updateMealLogDto.timestamp)
        : undefined,
    });

    return this.toResponse(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getOwnedMealLogOrThrow(id, userId);
    await this.mealLogRepository.delete(id);
  }

  private toResponse(log: any): MealLogResponseDto {
    return plainToInstance(MealLogResponseDto, log, {
      excludeExtraneousValues: true,
    });
  }
}
