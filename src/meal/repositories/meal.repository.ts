import { Injectable } from '@nestjs/common';
import { Meal, MealType, Prisma } from '@prisma/client';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';
import { PrismaService } from '../../database/prisma.service';
import { normalizePagination } from '../../common/utils/pagination';

export interface CreateMealData {
  name: string;
  mealType: MealType;
  calories?: number;
  proteins?: number;
  nutritionalInfo?: Prisma.InputJsonValue;
  sustainabilityScore?: number;
  pantryItemId?: string;
  barcode?: string;
  userId: string;
}

export type UpdateMealData = Partial<Omit<CreateMealData, 'userId'>>;

@Injectable()
export class MealRepository
  implements BaseRepository<Meal, CreateMealData, UpdateMealData>
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindAllOptions = {}): Promise<Meal[]> {
    return this.prisma.meal.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy || { createdAt: 'desc' },
    });
  }

  async findWithPagination(
    options: FindAllOptions = {},
  ): Promise<PaginatedResult<Meal>> {
    const { skip = 0, take = 10, where, orderBy } = options;
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);

    const [data, total] = await Promise.all([
      this.prisma.meal.findMany({
        skip: safeSkip,
        take: safeTake,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
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
    return this.prisma.meal.findUnique({
      where: { id },
    });
  }

  async findByBarcode(barcode: string): Promise<Meal | null> {
    return this.prisma.meal.findUnique({
      where: { barcode },
    });
  }

  async create(data: CreateMealData): Promise<Meal> {
    return this.prisma.meal.create({ data });
  }

  async update(id: string, data: UpdateMealData): Promise<Meal> {
    return this.prisma.meal.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.meal.delete({ where: { id } });
  }

  async count(where?: any): Promise<number> {
    return this.prisma.meal.count({ where });
  }
}
