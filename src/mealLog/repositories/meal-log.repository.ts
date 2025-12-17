import { Injectable } from '@nestjs/common';
import { MealLog, Prisma, TypeOfMeal } from '@prisma/client';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';
import { PrismaService } from '../../database/prisma.service';
import { normalizePagination } from '../../common/utils/pagination';

export interface CreateMealLogData {
  userId: string;
  mealId: string;
  typeOfMeal: TypeOfMeal;
  timestamp?: Date;
  mealFromPantry?: boolean;
  eatenOut?: boolean;
}

export type UpdateMealLogData = Partial<Omit<CreateMealLogData, 'userId'>>;

@Injectable()
export class MealLogRepository
  implements
    BaseRepository<
      MealLog,
      CreateMealLogData,
      UpdateMealLogData,
      Prisma.MealLogWhereInput
    >
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    options: FindAllOptions<
      Prisma.MealLogWhereInput,
      Prisma.MealLogOrderByWithRelationInput,
      Prisma.MealLogInclude
    > = {},
  ): Promise<MealLog[]> {
    return this.prisma.mealLog.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy || { timestamp: 'desc' },
      include: options.include,
    });
  }

  async findWithPagination(
    options: FindAllOptions<
      Prisma.MealLogWhereInput,
      Prisma.MealLogOrderByWithRelationInput,
      Prisma.MealLogInclude
    > = {},
  ): Promise<PaginatedResult<MealLog>> {
    const { skip = 0, take = 10, where, orderBy, include } = options;
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);

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
      limit: safeTake,
      totalPages,
    };
  }

  async findById(id: string): Promise<MealLog | null> {
    return this.prisma.mealLog.findUnique({
      where: { id },
      include: { meal: true } as Prisma.MealLogInclude,
    });
  }

  async create(data: CreateMealLogData): Promise<MealLog> {
    return this.prisma.mealLog.create({
      data: data as Prisma.MealLogUncheckedCreateInput,
      include: { meal: true } as Prisma.MealLogInclude,
    });
  }

  async update(id: string, data: UpdateMealLogData): Promise<MealLog> {
    return this.prisma.mealLog.update({
      where: { id },
      data: data as Prisma.MealLogUncheckedUpdateInput,
      include: { meal: true } as Prisma.MealLogInclude,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.mealLog.delete({ where: { id } });
  }

  async count(where?: Prisma.MealLogWhereInput): Promise<number> {
    return this.prisma.mealLog.count({ where });
  }
}
