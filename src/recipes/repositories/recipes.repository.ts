import { Injectable } from '@nestjs/common';
import { Allergens, Prisma, Recipe } from '@prisma/client';
import { RecipeWithIngredients } from '../interfaces/recommendation-score.interface';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';
import { PrismaService } from '../../database/prisma.service';
import { normalizePagination } from '../../common/utils/pagination';

export interface CreateRecipeIngredientData {
  name: string;
  measure?: string;
  order?: number;
  foodId?: string;
  foodCategoryId?: string;
}

export interface CreateRecipeData {
  userId?: string;
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
  price?: number;
  allergens?: Allergens[];
  // New fields for external recipes
  externalId?: string;
  imageUrl?: string;
  videoUrl?: string;
  cuisineType?: string;
  category?: string;
  isPublic?: boolean;
  dietaryLabels?: string[];
  ingredients?: CreateRecipeIngredientData[];
}

export interface UpdateRecipeData extends Partial<
  Omit<CreateRecipeData, 'userId'>
> {
  rating?: number;
  ratingCount?: number;
  ingredients?: CreateRecipeIngredientData[];
}

@Injectable()
export class RecipesRepository implements BaseRepository<
  Recipe,
  CreateRecipeData,
  UpdateRecipeData,
  Prisma.RecipeWhereInput
> {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeIngredients: Prisma.RecipeInclude = {
    ingredients: {
      orderBy: { order: 'asc' },
      include: {
        food: { select: { id: true, name: true, imageUrl: true } },
        foodCategory: {
          select: {
            id: true,
            foodName: true,
            nevoCode: true,
            energyKcal: true,
          },
        },
      },
    },
  };

  async findAll(
    options: FindAllOptions<
      Prisma.RecipeWhereInput,
      Prisma.RecipeOrderByWithRelationInput,
      Prisma.RecipeInclude
    > = {},
  ): Promise<Recipe[]> {
    return this.prisma.recipe.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy || { createdAt: 'desc' },
      include: { ...this.includeIngredients, ...options.include },
    });
  }

  async findWithPagination(
    options: FindAllOptions<
      Prisma.RecipeWhereInput,
      Prisma.RecipeOrderByWithRelationInput,
      Prisma.RecipeInclude
    > = {},
  ): Promise<PaginatedResult<Recipe>> {
    const { skip = 0, take = 10, where, orderBy, include } = options;
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);

    const [data, total] = await Promise.all([
      this.prisma.recipe.findMany({
        skip: safeSkip,
        take: safeTake,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include: { ...this.includeIngredients, ...include },
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

  async findById(id: string): Promise<Recipe | null> {
    return this.prisma.recipe.findUnique({
      where: { id },
      include: { ...this.includeIngredients, meals: true },
    });
  }

  async create(data: CreateRecipeData): Promise<Recipe> {
    const { ingredients, ...recipeData } = data;

    return this.prisma.recipe.create({
      data: {
        ...recipeData,
        ingredients: ingredients?.length
          ? {
              create: ingredients.map((ing, index) => ({
                name: ing.name,
                measure: ing.measure ?? null,
                order: ing.order ?? index,
                itemType: ing.foodId ? 'food' : 'food_category',
                foodId: ing.foodId ?? null,
                foodCategoryId: ing.foodCategoryId ?? null,
              })),
            }
          : undefined,
      } as Prisma.RecipeUncheckedCreateInput,
      include: { ...this.includeIngredients, meals: true },
    });
  }

  async update(id: string, data: UpdateRecipeData): Promise<Recipe> {
    const { ingredients, ...recipeData } = data;

    // If ingredients are provided, replace them all
    if (ingredients !== undefined) {
      return this.prisma.$transaction(async (tx) => {
        // Delete existing ingredients
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });

        // Update recipe and create new ingredients
        return tx.recipe.update({
          where: { id },
          data: {
            ...recipeData,
            ingredients: ingredients?.length
              ? {
                  create: ingredients.map((ing, index) => ({
                    name: ing.name,
                    measure: ing.measure ?? null,
                    order: ing.order ?? index,
                    itemType: ing.foodId ? 'food' : 'food_category',
                    foodId: ing.foodId ?? null,
                    foodCategoryId: ing.foodCategoryId ?? null,
                  })),
                }
              : undefined,
          } as Prisma.RecipeUncheckedUpdateInput,
          include: { ...this.includeIngredients, meals: true },
        });
      });
    }

    return this.prisma.recipe.update({
      where: { id },
      data: recipeData as Prisma.RecipeUncheckedUpdateInput,
      include: { ...this.includeIngredients, meals: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.recipe.delete({ where: { id } });
  }

  async count(where?: Prisma.RecipeWhereInput): Promise<number> {
    return this.prisma.recipe.count({ where });
  }

  async findCandidatesForRecommendation(
    foodIds: string[],
    categoryIds: string[],
    userId: string,
  ): Promise<RecipeWithIngredients[]> {
    if (foodIds.length === 0 && categoryIds.length === 0) {
      return [];
    }

    const orConditions: Prisma.RecipeIngredientWhereInput[] = [];
    if (foodIds.length > 0) {
      orConditions.push({ foodId: { in: foodIds } });
    }
    if (categoryIds.length > 0) {
      orConditions.push({ foodCategoryId: { in: categoryIds } });
    }

    return this.prisma.recipe.findMany({
      where: {
        OR: [{ isPublic: true }, { userId }],
        ingredients: {
          some: {
            OR: orConditions,
          },
        },
      },
      include: {
        ingredients: {
          orderBy: { order: 'asc' },
          include: {
            food: true,
            foodCategory: true,
          },
        },
      },
    });
  }
}
