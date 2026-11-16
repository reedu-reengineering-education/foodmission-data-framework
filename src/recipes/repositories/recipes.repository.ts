import { Injectable } from '@nestjs/common';
import {
  Allergens,
  Prisma,
  Recipe,
  RecipeOrigin,
  RecipeRating,
} from '@prisma/client';
import { RecipeWithIngredients } from '../interfaces/recommendation-score.interface';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';
import { PrismaService } from '../../database/prisma.service';
import { SearchableRecipe, SearchTerm } from '../utils/recipe-search';
import {
  hasWordMatch,
  searchPrefix,
} from '../../common/utils/text-search.util';
import { DEFAULT_LOCALE } from '../../i18n/constants';
import { normalizePagination } from '../../common/utils/pagination';
import {
  RECIPE_CANDIDATE_WITH_INGREDIENTS_INCLUDE,
  RECIPE_WITH_INGREDIENTS_AND_MEALS_INCLUDE,
  RECIPE_WITH_INGREDIENTS_INCLUDE,
} from '../../common/types/prisma-relations';

export const MAX_SEARCH_CANDIDATES = 100;

export interface CreateRecipeIngredientData {
  name: string;
  measure?: string;
  order?: number;
  foodProductId?: string;
  genericFoodId?: string;
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
  origin?: RecipeOrigin;
  ingredients?: CreateRecipeIngredientData[];
}

export interface RecipeAggregateRating {
  recipeId: string;
  rating: number;
  ratingCount: number;
  myRating: number | null;
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
      include: { ...RECIPE_WITH_INGREDIENTS_INCLUDE, ...options.include },
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
        include: { ...RECIPE_WITH_INGREDIENTS_INCLUDE, ...include },
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
      include: RECIPE_WITH_INGREDIENTS_AND_MEALS_INCLUDE,
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
                itemType: ing.foodProductId ? 'food_product' : 'generic_food',
                foodProductId: ing.foodProductId ?? null,
                genericFoodId: ing.genericFoodId ?? null,
              })),
            }
          : undefined,
      },
      include: RECIPE_WITH_INGREDIENTS_AND_MEALS_INCLUDE,
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
                    itemType: ing.foodProductId
                      ? 'food_product'
                      : 'generic_food',
                    foodProductId: ing.foodProductId ?? null,
                    genericFoodId: ing.genericFoodId ?? null,
                  })),
                }
              : undefined,
          },
          include: RECIPE_WITH_INGREDIENTS_AND_MEALS_INCLUDE,
        });
      });
    }

    return this.prisma.recipe.update({
      where: { id },
      data: recipeData,
      include: RECIPE_WITH_INGREDIENTS_AND_MEALS_INCLUDE,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.recipe.delete({ where: { id } });
  }

  findSearchCandidates(
    where: Prisma.RecipeWhereInput,
    terms: SearchTerm[],
  ): Promise<SearchableRecipe[]> {
    const contains = (prefix: string) => ({
      contains: prefix,
      mode: 'insensitive' as const,
    });
    return this.prisma.recipe.findMany({
      where: {
        ...where,
        AND: terms.map(({ word, genericFoodIds }) => {
          const prefix = searchPrefix(word);
          return {
            OR: [
              { title: contains(prefix) },
              {
                ingredients: {
                  some: {
                    OR: [
                      { name: contains(prefix) },
                      { genericFoodId: { in: genericFoodIds } },
                    ],
                  },
                },
              },
            ],
          };
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_SEARCH_CANDIDATES,
      select: {
        id: true,
        title: true,
        ingredients: { select: { name: true, genericFoodId: true } },
      },
    });
  }

  async findGenericFoodIdsByWord(
    word: string,
    locale: string,
  ): Promise<string[]> {
    const contains = {
      contains: searchPrefix(word),
      mode: 'insensitive' as const,
    };
    if (locale === DEFAULT_LOCALE) {
      const foods = await this.prisma.genericFood.findMany({
        where: { OR: [{ foodName: contains }, { synonym: contains }] },
        select: { id: true, foodName: true, synonym: true },
      });
      return foods
        .filter(
          (food) =>
            hasWordMatch(food.foodName, word) ||
            hasWordMatch(food.synonym ?? '', word),
        )
        .map((food) => food.id);
    }

    const translations = await this.prisma.entityTranslation.findMany({
      where: {
        entityType: 'GenericFood',
        locale,
        field: { in: ['foodName', 'synonym'] },
        value: contains,
      },
      select: { entityId: true, value: true },
    });
    return [
      ...new Set(
        translations
          .filter((row) => hasWordMatch(row.value, word))
          .map((row) => row.entityId),
      ),
    ];
  }

  async findByIds(ids: string[]): Promise<Recipe[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.recipe.findMany({
      where: { id: { in: ids } },
      include: RECIPE_WITH_INGREDIENTS_INCLUDE,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  async count(where?: Prisma.RecipeWhereInput): Promise<number> {
    return this.prisma.recipe.count({ where });
  }

  async findRating(
    recipeId: string,
    userId: string,
  ): Promise<RecipeRating | null> {
    return this.prisma.recipeRating.findUnique({
      where: { recipeId_userId: { recipeId, userId } },
    });
  }

  /**
   * Upserts the user's rating and recomputes the recipe aggregate in one
   * transaction, so rating/ratingCount never drift from the stored ratings.
   */
  async upsertRating(
    recipeId: string,
    userId: string,
    value: number,
  ): Promise<RecipeAggregateRating> {
    return this.prisma.$transaction(async (tx) => {
      await tx.recipeRating.upsert({
        where: { recipeId_userId: { recipeId, userId } },
        create: { recipeId, userId, value },
        update: { value },
      });

      return this.recomputeRatingAggregate(tx, recipeId, value);
    });
  }

  /**
   * Removes the user's rating and recomputes the recipe aggregate.
   * Returns null when the user had not rated the recipe.
   */
  async deleteRating(
    recipeId: string,
    userId: string,
  ): Promise<RecipeAggregateRating | null> {
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.recipeRating.deleteMany({
        where: { recipeId, userId },
      });

      if (deleted.count === 0) {
        return null;
      }

      return this.recomputeRatingAggregate(tx, recipeId, null);
    });
  }

  private async recomputeRatingAggregate(
    tx: Prisma.TransactionClient,
    recipeId: string,
    myRating: number | null,
  ): Promise<RecipeAggregateRating> {
    const aggregate = await tx.recipeRating.aggregate({
      where: { recipeId },
      _avg: { value: true },
      _count: { value: true },
    });

    const rating = aggregate._avg.value ?? 0;
    const ratingCount = aggregate._count.value;

    await tx.recipe.update({
      where: { id: recipeId },
      data: { rating, ratingCount },
    });

    return { recipeId, rating, ratingCount, myRating };
  }

  async findCandidatesForRecommendation(
    foodProductIds: string[],
    genericFoodIds: string[],
    userId: string,
    options: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.RecipeOrderByWithRelationInput;
    } = {},
  ): Promise<RecipeWithIngredients[]> {
    if (foodProductIds.length === 0 && genericFoodIds.length === 0) {
      return [];
    }

    const orConditions: Prisma.RecipeIngredientWhereInput[] = [];
    if (foodProductIds.length > 0) {
      orConditions.push({ foodProductId: { in: foodProductIds } });
    }
    if (genericFoodIds.length > 0) {
      orConditions.push({ genericFoodId: { in: genericFoodIds } });
    }

    const { skip = 0, take = 10, orderBy = { createdAt: 'desc' } } = options;

    return this.prisma.recipe.findMany({
      skip,
      take,
      where: {
        OR: [{ isPublic: true }, { userId }],
        ingredients: {
          some: {
            OR: orConditions,
          },
        },
      },
      orderBy,
      include: RECIPE_CANDIDATE_WITH_INGREDIENTS_INCLUDE,
    });
  }
}
