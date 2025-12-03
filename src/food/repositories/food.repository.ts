import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ERROR_CODES } from '../../common/utils/error.utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Food = Awaited<ReturnType<PrismaService['food']['create']>>;
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';

export interface CreateFoodDto {
  name: string;
  description?: string;
  barcode?: string;
  openFoodFactsId?: string;
  createdBy: string;
}

export interface UpdateFoodDto {
  name?: string;
  description?: string;
  barcode?: string;
  openFoodFactsId?: string;
}

@Injectable()
export class FoodRepository
  implements BaseRepository<Food, CreateFoodDto, UpdateFoodDto>
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindAllOptions = {}): Promise<Food[]> {
    return await this.prisma.food.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy || { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Food | null> {
    return await this.prisma.food.findUnique({
      where: { id },
    });
  }

  async findByBarcode(barcode: string): Promise<Food | null> {
    return await this.prisma.food.findUnique({
      where: { barcode },
    });
  }

  async findByOpenFoodFactsId(openFoodFactsId: string): Promise<Food | null> {
    return await this.prisma.food.findUnique({
      where: { openFoodFactsId },
    });
  }

  async findWithPagination(
    options: FindAllOptions,
  ): Promise<PaginatedResult<Food>> {
    const { skip = 0, take = 10, where, orderBy } = options;

    const [data, total] = await Promise.all([
      this.prisma.food.findMany({
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

  async searchByName(
    name: string,
    options: FindAllOptions = {},
  ): Promise<Food[]> {
    return await this.prisma.food.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
        ...options.where,
      },
      skip: options.skip,
      take: options.take,
      orderBy: options.orderBy || { createdAt: 'desc' },
    });
  }

  async create(data: CreateFoodDto): Promise<Food> {
    try {
      return await this.prisma.food.create({
        data,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT) {
          throw new Error(
            'Food with this barcode or OpenFoodFacts ID already exists',
          );
        }
      }
      throw error;
    }
  }

  async update(id: string, data: UpdateFoodDto): Promise<Food> {
    try {
      return await this.prisma.food.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === ERROR_CODES.PRISMA_RECORD_NOT_FOUND) {
          throw new Error('Food not found');
        }
        if (error.code === ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT) {
          throw new Error(
            'Food with this barcode or OpenFoodFacts ID already exists',
          );
        }
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.food.delete({
      where: { id },
    });
  }

  async count(where?: any): Promise<number> {
    return await this.prisma.food.count({ where });
  }
}
