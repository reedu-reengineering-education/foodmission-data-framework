import { Injectable } from '@nestjs/common';
import { MealLog, TypeOfMeal } from '@prisma/client';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';
import { PrismaService } from '../../database/prisma.service';

export interface CreateMealLogData {
  userId: string;
  dishId: string;
  typeOfMeal: TypeOfMeal;
  timestamp?: Date;
  mealFromPantry?: boolean;
  eatenOut?: boolean;
}

export type UpdateMealLogData = Partial<Omit<CreateMealLogData, 'userId'>>;

@Injectable()
export class MealLogRepository
  implements BaseRepository<MealLog, CreateMealLogData, UpdateMealLogData>
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindAllOptions = {}): Promise<MealLog[]> {
    return this.prisma.mealLog.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy || { timestamp: 'desc' },
      include: options.include,
    });
  }

  async findWithPagination(
    options: FindAllOptions = {},
  ): Promise<PaginatedResult<MealLog>> {
    const { skip = 0, take = 10, where, orderBy, include } = options;
    const safeTake = take && take > 0 ? take : 10;
    const safeSkip = skip && skip > 0 ? skip : 0;

    const [data, total] = await Promise.all([
      this.prisma.mealLog.findMany({
        skip: safeSkip,
        take: safeTake,
        where,
        orderBy: orderBy || { timestamp: 'desc' },
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
      limit: take,
      totalPages,
    };
  }

  async findById(id: string): Promise<MealLog | null> {
    return this.prisma.mealLog.findUnique({
      where: { id },
      include: { dish: true },
    });
  }

  async create(data: CreateMealLogData): Promise<MealLog> {
    return this.prisma.mealLog.create({
      data,
      include: { dish: true },
    });
  }

  async update(id: string, data: UpdateMealLogData): Promise<MealLog> {
    return this.prisma.mealLog.update({
      where: { id },
      data,
      include: { dish: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.mealLog.delete({ where: { id } });
  }

  async count(where?: any): Promise<number> {
    return this.prisma.mealLog.count({ where });
  }
}
