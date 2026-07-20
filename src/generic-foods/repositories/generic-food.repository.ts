import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateGenericFoodDto } from '../dto/create-generic-food.dto';
import { UpdateGenericFoodDto } from '../dto/update-generic-food.dto';
import { GenericFoodQueryDto } from '../dto/generic-food-query.dto';
import { DEFAULT_LOCALE } from '../../i18n/constants';

export type GenericFoodFindAllContext = {
  /** Entity IDs whose translated foodName/synonym match search (non-English). */
  localizedSearchIds?: string[];
  /** Entity IDs whose translated foodGroup matches filter (non-English). */
  localizedFoodGroupIds?: string[];
};

@Injectable()
export class GenericFoodRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateGenericFoodDto) {
    return this.prisma.genericFood.create({
      data,
    });
  }

  async findAll(
    query: GenericFoodQueryDto,
    context?: GenericFoodFindAllContext,
  ) {
    const { search, foodGroup, page = 1, limit = 20, lang } = query;
    const skip = (page - 1) * limit;
    const locale = (lang ?? DEFAULT_LOCALE).toLowerCase();
    const localizedSearchIds = context?.localizedSearchIds;
    const localizedFoodGroupIds = context?.localizedFoodGroupIds;
    const useLocalizedSearch =
      Boolean(search) &&
      locale !== DEFAULT_LOCALE &&
      Array.isArray(localizedSearchIds);
    const useLocalizedFoodGroup =
      Boolean(foodGroup) &&
      locale !== DEFAULT_LOCALE &&
      Array.isArray(localizedFoodGroupIds);

    const where: Prisma.GenericFoodWhereInput = {};
    const conditions: Prisma.GenericFoodWhereInput[] = [];

    if (search) {
      const englishMatch: Prisma.GenericFoodWhereInput = {
        OR: [
          { foodName: { contains: search, mode: 'insensitive' } },
          {
            AND: [
              { synonym: { not: null } },
              { synonym: { contains: search, mode: 'insensitive' } },
            ],
          },
        ],
      };

      if (useLocalizedSearch && localizedSearchIds!.length > 0) {
        conditions.push({
          OR: [englishMatch, { id: { in: localizedSearchIds } }],
        });
      } else {
        conditions.push(englishMatch);
      }
    }

    if (foodGroup) {
      const englishFoodGroup: Prisma.GenericFoodWhereInput = {
        foodGroup: { equals: foodGroup, mode: 'insensitive' },
      };

      if (useLocalizedFoodGroup && localizedFoodGroupIds!.length > 0) {
        conditions.push({
          OR: [englishFoodGroup, { id: { in: localizedFoodGroupIds } }],
        });
      } else {
        conditions.push(englishFoodGroup);
      }
    }

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
    const where: Prisma.GenericFoodWhereInput = {};

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
