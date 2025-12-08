import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class MealLogService {
  private readonly logger = new Logger(MealLogService.name);

  constructor(
    private readonly mealLogRepository: MealLogRepository,
    private readonly dishRepository: DishRepository,
  ) {}

  async create(
    createMealLogDto: CreateMealLogDto,
    userId: string,
  ): Promise<MealLogResponseDto> {
    const dish = await this.dishRepository.findById(createMealLogDto.dishId);
    if (!dish) {
      throw new NotFoundException('Dish not found');
    }
    this.ensureOwnership(dish.userId, userId);

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
    const mealLog = await this.mealLogRepository.findById(id);
    if (!mealLog) {
      throw new NotFoundException('Meal log not found');
    }
    this.ensureOwnership(mealLog.userId, userId);
    return this.toResponse(mealLog);
  }

  async update(
    id: string,
    updateMealLogDto: UpdateMealLogDto,
    userId: string,
  ): Promise<MealLogResponseDto> {
    const mealLog = await this.mealLogRepository.findById(id);
    if (!mealLog) {
      throw new NotFoundException('Meal log not found');
    }
    this.ensureOwnership(mealLog.userId, userId);

    if (updateMealLogDto.dishId && updateMealLogDto.dishId !== mealLog.dishId) {
      const dish = await this.dishRepository.findById(updateMealLogDto.dishId);
      if (!dish) {
        throw new NotFoundException('Dish not found');
      }
      this.ensureOwnership(dish.userId, userId);
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
    const mealLog = await this.mealLogRepository.findById(id);
    if (!mealLog) {
      throw new NotFoundException('Meal log not found');
    }
    this.ensureOwnership(mealLog.userId, userId);
    await this.mealLogRepository.delete(id);
  }

  private ensureOwnership(ownerId: string, userId: string) {
    if (ownerId !== userId) {
      throw new ForbiddenException('No permission to access this resource');
    }
  }

  private toResponse(log: any): MealLogResponseDto {
    return plainToInstance(MealLogResponseDto, log, {
      excludeExtraneousValues: true,
    });
  }
}
