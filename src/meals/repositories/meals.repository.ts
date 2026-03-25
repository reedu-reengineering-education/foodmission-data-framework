import { Injectable } from '@nestjs/common';
import {
  DietaryLabel,
  MealCategory,
  MealCourse,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';
import { PrismaService } from '../../database/prisma.service';
import { normalizePagination } from '../../common/utils/pagination';

// Extract types from PrismaClient delegate - meal exists (verified in generated types at line 299)
// TypeScript may cache old types, so we extract from PrismaClient which has the meal delegate
type MealDelegate = PrismaClient[Extract<keyof PrismaClient, 'meal'>];
type Meal = Awaited<ReturnType<MealDelegate['create']>>;
// Use Prisma types directly - they exist in the Prisma namespace
// Type assertions are needed due to TypeScript cache issues
type MealWhereInput = Prisma.MealWhereInput;
type MealOrderByWithRelationInput = Prisma.MealOrderByWithRelationInput;
type MealInclude = Prisma.MealInclude;

export interface CreateMealData {
  name: string;
  recipeId?: string;
  calories?: number;
  proteins?: number;
  nutritionalInfo?: Prisma.InputJsonValue;
  sustainabilityScore?: number;
  price?: number;
  barcode?: string;
  mealCategories?: MealCategory[];
  mealCourse?: MealCourse;
  dietaryLabels?: DietaryLabel[];
  userId: string;
}

export type UpdateMealData = Partial<Omit<CreateMealData, 'userId'>>;

@Injectable()
export class MealsRepository implements BaseRepository<
  Meal,
  CreateMealData,
  UpdateMealData,
  MealWhereInput
> {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    options: FindAllOptions<
      MealWhereInput,
      MealOrderByWithRelationInput,
      MealInclude
    > = {},
  ): Promise<Meal[]> {
    return (this.prisma as unknown as PrismaClient).meal.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy || { createdAt: 'desc' },
      include: options.include,
    });
  }

  async findWithPagination(
    options: FindAllOptions<
      MealWhereInput,
      MealOrderByWithRelationInput,
      MealInclude
    > = {},
  ): Promise<PaginatedResult<Meal>> {
    const { skip = 0, take = 10, where, orderBy, include } = options;
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);

    const [data, total] = await Promise.all([
      (this.prisma as unknown as PrismaClient).meal.findMany({
        skip: safeSkip,
        take: safeTake,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include,
      }),
      this.count(where),
    ]);

    const page = Math.floor(safeSkip / safeTake) + 1;
    const totalPages = Math.ceil(total / safeTake);

    return {
      data,
      total,
      page,
      limit: safeTake,
      totalPages,
    };
  }

  async findById(id: string): Promise<Meal | null> {
    return (this.prisma as unknown as PrismaClient).meal.findUnique({
      where: { id },
    });
  }

  async findByBarcode(barcode: string): Promise<Meal | null> {
    return (this.prisma as unknown as PrismaClient).meal.findUnique({
      where: { barcode },
    });
  }

  async create(data: CreateMealData): Promise<Meal> {
    return (this.prisma as unknown as PrismaClient).meal.create({ data });
  }

  async update(id: string, data: UpdateMealData): Promise<Meal> {
    return (this.prisma as unknown as PrismaClient).meal.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await (this.prisma as unknown as PrismaClient).meal.delete({
      where: { id },
    });
  }

  async count(where?: MealWhereInput): Promise<number> {
    return (this.prisma as unknown as PrismaClient).meal.count({ where });
  }
}
