import { Injectable } from '@nestjs/common';
import { Dish, MealType, Prisma } from '@prisma/client';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';
import { PrismaService } from '../../database/prisma.service';

export interface CreateDishData {
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

export type UpdateDishData = Partial<Omit<CreateDishData, 'userId'>>;

@Injectable()
export class DishRepository
  implements BaseRepository<Dish, CreateDishData, UpdateDishData>
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindAllOptions = {}): Promise<Dish[]> {
    return this.prisma.dish.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy || { createdAt: 'desc' },
    });
  }

  async findWithPagination(
    options: FindAllOptions = {},
  ): Promise<PaginatedResult<Dish>> {
    const { skip = 0, take = 10, where, orderBy } = options;

    const [data, total] = await Promise.all([
      this.prisma.dish.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
      }),
      this.count(where),
    ]);

    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);

    return {
      data,
      total,
      page,
      limit: take,
      totalPages,
    };
  }

  async findById(id: string): Promise<Dish | null> {
    return this.prisma.dish.findUnique({
      where: { id },
    });
  }

  async findByBarcode(barcode: string): Promise<Dish | null> {
    return this.prisma.dish.findUnique({
      where: { barcode },
    });
  }

  async create(data: CreateDishData): Promise<Dish> {
    return this.prisma.dish.create({ data });
  }

  async update(id: string, data: UpdateDishData): Promise<Dish> {
    return this.prisma.dish.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.dish.delete({ where: { id } });
  }

  async count(where?: any): Promise<number> {
    return this.prisma.dish.count({ where });
  }
}
