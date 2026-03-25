import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFoodCategoryDto } from '../dto/create-food-category.dto';
import { UpdateFoodCategoryDto } from '../dto/update-food-category.dto';
import { FoodCategoryQueryDto } from '../dto/food-category-query.dto';

@Injectable()
export class FoodCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFoodCategoryDto) {
    return this.prisma.foodCategory.create({
      data,
    });
  }

  async findAll(query: FoodCategoryQueryDto) {
    const { search, foodGroup, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    const conditions: any[] = [];

    if (search) {
      conditions.push({
        OR: [
          { foodName: { contains: search, mode: 'insensitive' } },
          {
            AND: [
              { synonym: { not: null } },
              { synonym: { contains: search, mode: 'insensitive' } },
            ],
          },
        ],
      });
    }

    if (foodGroup) {
      conditions.push({
        foodGroup: { equals: foodGroup, mode: 'insensitive' },
      });
    }

    // Combine conditions with AND logic
    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const [items, total] = await Promise.all([
      this.prisma.foodCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { foodName: 'asc' },
      }),
      this.prisma.foodCategory.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return this.prisma.foodCategory.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: UpdateFoodCategoryDto) {
    return this.prisma.foodCategory.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.foodCategory.delete({
      where: { id },
    });
  }

  async findByNevoCode(nevoCode: number) {
    return this.prisma.foodCategory.findUnique({
      where: { nevoCode },
    });
  }

  async getAllFoodGroups(search?: string): Promise<string[]> {
    const where: any = {};

    if (search) {
      where.foodGroup = { contains: search, mode: 'insensitive' };
    }

    const result = await this.prisma.foodCategory.findMany({
      where,
      select: { foodGroup: true },
      distinct: ['foodGroup'],
      orderBy: { foodGroup: 'asc' },
    });

    return result.map((r) => r.foodGroup);
  }
}
