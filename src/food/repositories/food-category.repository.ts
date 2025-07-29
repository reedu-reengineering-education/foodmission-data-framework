import { Injectable } from '@nestjs/common';
import { FoodCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';

export interface CreateFoodCategoryDto {
  name: string;
  description?: string;
}

export interface UpdateFoodCategoryDto {
  name?: string;
  description?: string;
}

export interface FoodCategoryWithCount extends FoodCategory {
  _count: {
    foods: number;
  };
}

@Injectable()
export class FoodCategoryRepository
  implements
    BaseRepository<FoodCategory, CreateFoodCategoryDto, UpdateFoodCategoryDto>
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindAllOptions = {}): Promise<FoodCategory[]> {
    try {
      return await this.prisma.foodCategory.findMany({
        skip: options.skip,
        take: options.take,
        where: options.where,
        orderBy: options.orderBy || { name: 'asc' },
        include: options.include,
      });
    } catch (error) {
      console.error('Error finding food categories:', error);
      throw new Error('Failed to retrieve food categories');
    }
  }

  async findAllWithFoodCount(): Promise<FoodCategoryWithCount[]> {
    try {
      return await this.prisma.foodCategory.findMany({
        include: {
          _count: {
            select: {
              foods: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      console.error('Error finding food categories with count:', error);
      throw new Error('Failed to retrieve food categories with count');
    }
  }

  async findById(id: string): Promise<FoodCategory | null> {
    try {
      return await this.prisma.foodCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              foods: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Error finding food category by id:', error);
      throw new Error('Failed to retrieve food category');
    }
  }

  async findByName(name: string): Promise<FoodCategory | null> {
    try {
      return await this.prisma.foodCategory.findUnique({
        where: { name },
      });
    } catch (error) {
      console.error('Error finding food category by name:', error);
      throw new Error('Failed to retrieve food category by name');
    }
  }

  async findWithPagination(
    options: FindAllOptions,
  ): Promise<PaginatedResult<FoodCategoryWithCount>> {
    try {
      const { skip = 0, take = 10, where, orderBy } = options;

      const [data, total] = await Promise.all([
        this.prisma.foodCategory.findMany({
          skip,
          take,
          where,
          orderBy: orderBy || { name: 'asc' },
          include: {
            _count: {
              select: {
                foods: true,
              },
            },
          },
        }),
        this.count(where),
      ]);

      const page = Math.floor(skip / take) + 1;
      const totalPages = Math.ceil(total / take);

      return {
        data: data as FoodCategoryWithCount[],
        total,
        page,
        limit: take,
        totalPages,
      };
    } catch (error) {
      console.error('Error finding food categories with pagination:', error);
      throw new Error('Failed to retrieve paginated food categories');
    }
  }

  async searchByName(
    name: string,
    options: FindAllOptions = {},
  ): Promise<FoodCategory[]> {
    try {
      return await this.prisma.foodCategory.findMany({
        where: {
          name: {
            contains: name,
            mode: 'insensitive',
          },
          ...options.where,
        },
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy || { name: 'asc' },
        include: options.include,
      });
    } catch (error) {
      console.error('Error searching food categories by name:', error);
      throw new Error('Failed to search food categories');
    }
  }

  async create(data: CreateFoodCategoryDto): Promise<FoodCategory> {
    try {
      return await this.prisma.foodCategory.create({
        data,
      });
    } catch (error) {
      console.error('Error creating food category:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Food category with this name already exists');
        }
      }
      throw new Error('Failed to create food category');
    }
  }

  async update(id: string, data: UpdateFoodCategoryDto): Promise<FoodCategory> {
    try {
      return await this.prisma.foodCategory.update({
        where: { id },
        data,
      });
    } catch (error) {
      console.error('Error updating food category:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Food category not found');
        }
        if (error.code === 'P2002') {
          throw new Error('Food category with this name already exists');
        }
      }
      throw new Error('Failed to update food category');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Check if category has foods before deleting
      const foodCount = await this.prisma.food.count({
        where: { categoryId: id },
      });

      if (foodCount > 0) {
        throw new Error('Cannot delete category that contains foods');
      }

      await this.prisma.foodCategory.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting food category:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Food category not found');
        }
      }
      if (error.message === 'Cannot delete category that contains foods') {
        throw error;
      }
      throw new Error('Failed to delete food category');
    }
  }

  async count(where?: any): Promise<number> {
    try {
      return await this.prisma.foodCategory.count({ where });
    } catch (error) {
      console.error('Error counting food categories:', error);
      throw new Error('Failed to count food categories');
    }
  }
}
