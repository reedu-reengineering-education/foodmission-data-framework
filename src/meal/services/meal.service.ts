import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { MealRepository } from '../repositories/meal.repository';
import { PantryItemRepository } from '../../pantryItem/repositories/pantryItem.repository';
import { CreateMealDto } from '../dto/create-meal.dto';
import { UpdateMealDto } from '../dto/update-meal.dto';
import {
  MealResponseDto,
  MultipleMealResponseDto,
} from '../dto/meal-response.dto';
import { QueryMealDto } from '../dto/query-meal.dto';
import { Prisma } from '@prisma/client';
import { getOwnedEntityOrThrow } from '../../common/services/ownership-helpers';

@Injectable()
export class MealService {
  private readonly logger = new Logger(MealService.name);

  constructor(
    private readonly mealRepository: MealRepository,
    private readonly pantryItemRepository: PantryItemRepository,
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

  async create(
    createMealDto: CreateMealDto,
    userId: string,
  ): Promise<MealResponseDto> {
    this.logger.log(`Creating meal ${createMealDto.name} for user ${userId}`);

    if (createMealDto.barcode) {
      const existing = await this.mealRepository.findByBarcode(
        createMealDto.barcode,
      );
      if (existing) {
        throw new ConflictException('Meal with this barcode already exists');
      }
    }

    if (createMealDto.pantryItemId) {
      const pantryItem = await this.pantryItemRepository.findById(
        createMealDto.pantryItemId,
      );
      if (!pantryItem) {
        throw new NotFoundException('Linked pantry item not found');
      }
      if (pantryItem.pantry.userId !== userId) {
        throw new ForbiddenException('No permission to use this pantry item');
      }
    }

    const meal = await this.mealRepository.create({
      ...createMealDto,
      userId,
    });

    return this.toResponseDto(meal);
  }

  async findAll(
    userId: string,
    query: QueryMealDto,
  ): Promise<MultipleMealResponseDto> {
    const { page = 1, limit = 10, mealType, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MealWhereInput = {
      userId,
      ...(mealType ? { mealType } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const result = await this.mealRepository.findWithPagination({
      skip,
      take: limit,
      where,
      orderBy: { createdAt: 'desc' },
    });

    return plainToInstance(
      MultipleMealResponseDto,
      {
        data: result.data.map((d) => this.toResponseDto(d)),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
      { excludeExtraneousValues: true },
    );
  }

  async findOne(id: string, userId: string): Promise<MealResponseDto> {
    const meal = await this.getOwnedMealOrThrow(id, userId);
    return this.toResponseDto(meal);
  }

  async update(
    id: string,
    updateMealDto: UpdateMealDto,
    userId: string,
  ): Promise<MealResponseDto> {
    const meal = await this.getOwnedMealOrThrow(id, userId);

    if (
      updateMealDto.barcode &&
      updateMealDto.barcode !== meal.barcode &&
      (await this.mealRepository.findByBarcode(updateMealDto.barcode))
    ) {
      throw new ConflictException('Meal with this barcode already exists');
    }

    if (updateMealDto.pantryItemId) {
      const pantryItem = await this.pantryItemRepository.findById(
        updateMealDto.pantryItemId,
      );
      if (!pantryItem) {
        throw new NotFoundException('Linked pantry item not found');
      }
      if (pantryItem.pantry.userId !== userId) {
        throw new ForbiddenException('No permission to use this pantry item');
      }
    }

    const updated = await this.mealRepository.update(id, updateMealDto);
    return this.toResponseDto(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getOwnedMealOrThrow(id, userId);
    await this.mealRepository.delete(id);
  }

  private toResponseDto(meal: any): MealResponseDto {
    return plainToInstance(MealResponseDto, meal, {
      excludeExtraneousValues: true,
    });
  }
}
