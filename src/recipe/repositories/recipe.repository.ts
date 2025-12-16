import { Injectable } from '@nestjs/common';
import { Prisma, Recipe } from '@prisma/client';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';
import { PrismaService } from '../../database/prisma.service';
import { normalizePagination } from '../../common/utils/pagination';

export interface CreateRecipeData {
  userId: string;
  dishId: string;
  title: string;
  description?: string;
  instructions?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: string;
  tags?: string[];
  nutritionalInfo?: Prisma.InputJsonValue;
  sustainabilityScore?: number;
  allergens?: string[];
}

export interface UpdateRecipeData
  extends Partial<Omit<CreateRecipeData, 'userId'>> {
  rating?: number;
  ratingCount?: number;
}

@Injectable()
export class RecipeRepository
  implements BaseRepository<Recipe, CreateRecipeData, UpdateRecipeData>
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindAllOptions = {}): Promise<Recipe[]> {
    return this.prisma.recipe.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy || { createdAt: 'desc' },
      include: options.include,
    });
  }

  async findWithPagination(
    options: FindAllOptions = {},
  ): Promise<PaginatedResult<Recipe>> {
    const { skip = 0, take = 10, where, orderBy, include } = options;
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);

    const [data, total] = await Promise.all([
      this.prisma.recipe.findMany({
        skip: safeSkip,
        take: safeTake,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
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

  async findById(id: string): Promise<Recipe | null> {
    return this.prisma.recipe.findUnique({
      where: { id },
      include: { dish: true },
    });
  }

  async create(data: CreateRecipeData): Promise<Recipe> {
    return this.prisma.recipe.create({
      data,
      include: { dish: true },
    });
  }

  async update(id: string, data: UpdateRecipeData): Promise<Recipe> {
    return this.prisma.recipe.update({
      where: { id },
      data,
      include: { dish: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.recipe.delete({ where: { id } });
  }

  async count(where?: any): Promise<number> {
    return this.prisma.recipe.count({ where });
  }
}
