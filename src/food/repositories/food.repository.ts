import { Injectable } from '@nestjs/common';
import { Food, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
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
  categoryId: string;
  createdBy: string;
}

export interface UpdateFoodDto {
  name?: string;
  description?: string;
  barcode?: string;
  openFoodFactsId?: string;
  categoryId?: string;
}

export interface FoodWithCategory extends Food {
  category: {
    id: string;
    name: string;
    description: string | null;
  };
}

@Injectable()
export class FoodRepository
  implements BaseRepository<Food, CreateFoodDto, UpdateFoodDto>
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindAllOptions = {}): Promise<Food[]> {
    try {
      return await this.prisma.food.findMany({
        skip: options.skip,
        take: options.take,
        where: options.where,
        orderBy: options.orderBy || { createdAt: 'desc' },
        include: options.include,
      });
    } catch (error) {
      console.error('Error finding foods:', error);
      throw new Error('Failed to retrieve foods');
    }
  }

  async findById(id: string): Promise<Food | null> {
    try {
      return await this.prisma.food.findUnique({
        where: { id },
        include: {
          category: true,
        },
      });
    } catch (error) {
      console.error('Error finding food by id:', error);
      throw new Error('Failed to retrieve food');
    }
  }

  async findByBarcode(barcode: string): Promise<Food | null> {
    try {
      return await this.prisma.food.findUnique({
        where: { barcode },
        include: {
          category: true,
        },
      });
    } catch (error) {
      console.error('Error finding food by barcode:', error);
      throw new Error('Failed to retrieve food by barcode');
    }
  }

  async findByOpenFoodFactsId(openFoodFactsId: string): Promise<Food | null> {
    try {
      return await this.prisma.food.findUnique({
        where: { openFoodFactsId },
        include: {
          category: true,
        },
      });
    } catch (error) {
      console.error('Error finding food by OpenFoodFacts ID:', error);
      throw new Error('Failed to retrieve food by OpenFoodFacts ID');
    }
  }

  async findWithPagination(
    options: FindAllOptions,
  ): Promise<PaginatedResult<FoodWithCategory>> {
    try {
      const { skip = 0, take = 10, where, orderBy } = options;

      const [data, total] = await Promise.all([
        this.prisma.food.findMany({
          skip,
          take,
          where,
          orderBy: orderBy || { createdAt: 'desc' },
          include: {
            category: true,
          },
        }),
        this.count(where),
      ]);

      const page = Math.floor(skip / take) + 1;
      const totalPages = Math.ceil(total / take);

      return {
        data: data as FoodWithCategory[],
        total,
        page,
        limit: take,
        totalPages,
      };
    } catch (error) {
      console.error('Error finding foods with pagination:', error);
      throw new Error('Failed to retrieve paginated foods');
    }
  }

  async searchByName(
    name: string,
    options: FindAllOptions = {},
  ): Promise<Food[]> {
    try {
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
        include: options.include,
      });
    } catch (error) {
      console.error('Error searching foods by name:', error);
      throw new Error('Failed to search foods');
    }
  }

  async findByCategory(
    categoryId: string,
    options: FindAllOptions = {},
  ): Promise<Food[]> {
    try {
      return await this.prisma.food.findMany({
        where: {
          categoryId,
          ...options.where,
        },
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy || { createdAt: 'desc' },
        include: options.include,
      });
    } catch (error) {
      console.error('Error finding foods by category:', error);
      throw new Error('Failed to retrieve foods by category');
    }
  }

  async create(data: CreateFoodDto): Promise<Food> {
    try {
      return await this.prisma.food.create({
        data,
        include: {
          category: true,
        },
      });
    } catch (error) {
      console.error('Error creating food:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error(
            'Food with this barcode or OpenFoodFacts ID already exists',
          );
        }
        if (error.code === 'P2003') {
          throw new Error('Invalid category ID provided');
        }
      }
      throw new Error('Failed to create food');
    }
  }

  async update(id: string, data: UpdateFoodDto): Promise<Food> {
    try {
      return await this.prisma.food.update({
        where: { id },
        data,
        include: {
          category: true,
        },
      });
    } catch (error) {
      console.error('Error updating food:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Food not found');
        }
        if (error.code === 'P2002') {
          throw new Error(
            'Food with this barcode or OpenFoodFacts ID already exists',
          );
        }
        if (error.code === 'P2003') {
          throw new Error('Invalid category ID provided');
        }
      }
      throw new Error('Failed to update food');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.food.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting food:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Food not found');
        }
      }
      throw new Error('Failed to delete food');
    }
  }

  async count(where?: any): Promise<number> {
    try {
      return await this.prisma.food.count({ where });
    } catch (error) {
      console.error('Error counting foods:', error);
      throw new Error('Failed to count foods');
    }
  }
}
