import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateGenericFoodDto } from '../dto/create-generic-food.dto';
import { UpdateGenericFoodDto } from '../dto/update-generic-food.dto';

import { GenericFoodQueryDto } from '../dto/generic-food-query.dto';

@Injectable()
export class GenericFoodRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateGenericFoodDto) {
    return this.prisma.genericFood.create({
      data,
    });
  }

  async findAll(query: GenericFoodQueryDto) {
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
      this.prisma.genericFood.findMany({
        where,
        skip,
        take: limit,
        orderBy: { foodName: 'asc' },
      }),
      this.prisma.genericFood.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  findById(id: string) {
    return this.prisma.genericFood.findUnique({
      where: { id },
    });
  }

  update(id: string, data: UpdateGenericFoodDto) {
    return this.prisma.genericFood.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.genericFood.delete({
      where: { id },
    });
  }

  findByNevoCode(nevoCode: number) {
    return this.prisma.genericFood.findUnique({
      where: { nevoCode },
    });
  }

  async getAllFoodGroups(search?: string): Promise<string[]> {
    const where: any = {};

    if (search) {
      where.foodGroup = { contains: search, mode: 'insensitive' };
    }

    const result = await this.prisma.genericFood.findMany({
      where,
      select: { foodGroup: true },
      distinct: ['foodGroup'],
      orderBy: { foodGroup: 'asc' },
    });

    return result.map((r) => r.foodGroup);
  }
}
