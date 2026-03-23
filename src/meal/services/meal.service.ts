import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { MealRepository } from '../repositories/meal.repository';
import { CreateMealDto } from '../dto/create-meal.dto';
import { UpdateMealDto } from '../dto/update-meal.dto';
import {
  MealResponseDto,
  MultipleMealResponseDto,
} from '../dto/meal-response.dto';
import { QueryMealDto } from '../dto/query-meal.dto';
import { DietaryLabel, MealCategory, MealCourse, Prisma } from '@prisma/client';
import { getOwnedEntityOrThrow } from '../../common/services/ownership-helpers';

type MealDtoSource = {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  recipeId?: string | null;
  calories?: number | null;
  proteins?: number | null;
  nutritionalInfo?: Prisma.JsonValue | null;
  sustainabilityScore?: number | null;
  price?: number | null;
  barcode?: string | null;
  mealCategories?: MealCategory[];
  mealCourse?: MealCourse | null;
  dietaryLabels?: DietaryLabel[];
};

@Injectable()
export class MealService {
  private readonly logger = new Logger(MealService.name);

  constructor(private readonly mealRepository: MealRepository) {}

  private requireOwnedMeal(mealId: string, userId: string) {
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

    const meal = await this.mealRepository.create({
      name: createMealDto.name,
      ...this.mapMealWriteInput(createMealDto),
      userId,
    });

    return this.toResponseDto(meal);
  }

  async findAll(
    userId: string,
    query: QueryMealDto,
  ): Promise<MultipleMealResponseDto> {
    const {
      page = 1,
      limit = 10,
      recipeId,
      search,
      mealCategory,
      mealCourse,
      dietaryPreference,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MealWhereInput = {
      userId,
      ...(recipeId ? { recipeId } : {}),
      ...(mealCategory ? { mealCategories: { has: mealCategory } } : {}),
      ...(mealCourse ? { mealCourse } : {}),
      ...(dietaryPreference
        ? { dietaryLabels: { has: dietaryPreference } }
        : {}),
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
    const meal = await this.requireOwnedMeal(id, userId);
    return this.toResponseDto(meal);
  }

  async update(
    id: string,
    updateMealDto: UpdateMealDto,
    userId: string,
  ): Promise<MealResponseDto> {
    const meal = await this.requireOwnedMeal(id, userId);

    if (
      updateMealDto.barcode &&
      updateMealDto.barcode !== meal.barcode &&
      (await this.mealRepository.findByBarcode(updateMealDto.barcode))
    ) {
      throw new ConflictException('Meal with this barcode already exists');
    }

    const updated = await this.mealRepository.update(id, {
      ...this.mapMealWriteInput(updateMealDto),
    });
    return this.toResponseDto(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.requireOwnedMeal(id, userId);
    await this.mealRepository.delete(id);
  }

  private toResponseDto(meal: MealDtoSource): MealResponseDto {
    // Rename DB column `dietaryLabels` to API field `dietaryPreferences`.
    const mapped = {
      ...meal,
      dietaryPreferences: meal.dietaryLabels,
    };
    return plainToInstance(MealResponseDto, mapped, {
      excludeExtraneousValues: true,
    });
  }

  private uniqueEnumArray<T extends string>(values?: T[]): T[] | undefined {
    if (!values) return undefined;
    return Array.from(new Set(values));
  }

  private mapMealWriteInput(
    dto: Partial<
      Pick<
        CreateMealDto,
        | 'recipeId'
        | 'calories'
        | 'proteins'
        | 'nutritionalInfo'
        | 'sustainabilityScore'
        | 'price'
        | 'barcode'
        | 'mealCategories'
        | 'mealCourse'
        | 'dietaryPreferences'
      >
    >,
  ) {
    const { dietaryPreferences, ...rest } = dto;
    return {
      ...rest,
      ...(dto.mealCategories
        ? { mealCategories: this.uniqueEnumArray(dto.mealCategories) }
        : {}),
      ...(dietaryPreferences
        ? { dietaryLabels: this.uniqueEnumArray(dietaryPreferences) }
        : {}),
    };
  }
}
