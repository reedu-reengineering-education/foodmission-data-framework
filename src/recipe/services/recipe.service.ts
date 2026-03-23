import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RecipeRepository } from '../repositories/recipe.repository';
import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';
import {
  MultipleRecipeResponseDto,
  RecipeResponseDto,
} from '../dto/recipe-response.dto';
import { QueryRecipeDto } from '../dto/query-recipe.dto';
import { Prisma } from '@prisma/client';
import { getOwnedEntityOrThrow } from '../../common/services/ownership-helpers';
import { handlePrismaError } from '../../common/utils/error.utils';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class RecipeService {
  private readonly logger = new Logger(RecipeService.name);

  constructor(private readonly recipeRepository: RecipeRepository) {}

  private getOwnedRecipeOrThrow(recipeId: string, userId: string) {
    return getOwnedEntityOrThrow(
      recipeId,
      userId,
      (id) => this.recipeRepository.findById(id),
      (r) => r.userId,
      'Recipe not found',
    );
  }

  async create(
    createRecipeDto: CreateRecipeDto,
    userId: string,
  ): Promise<RecipeResponseDto> {
    this.logger.log(`Creating recipe ${createRecipeDto.title} for ${userId}`);

    try {
      const recipe = await this.recipeRepository.create({
        ...createRecipeDto,
        allergens: createRecipeDto.allergens ?? [],
        userId,
      });
      return this.toResponse(recipe);
    } catch (error) {
      throw handlePrismaError(error, 'create recipe', 'Recipe');
    }
  }

  async findAll(
    userId: string,
    query: QueryRecipeDto,
  ): Promise<MultipleRecipeResponseDto> {
    const {
      page = 1,
      limit = 10,
      category,
      cuisineType,
      source,
      isPublic,
      dietaryLabels,
      tags,
      allergens,
      difficulty,
      search,
    } = query;
    const skip = (page - 1) * limit;

    // Visibility: when isPublic is explicit, use it; otherwise show user's recipes OR public
    const visibilityWhere: Prisma.RecipeWhereInput =
      isPublic === true
        ? { isPublic: true }
        : isPublic === false
          ? { userId, isPublic: false }
          : { OR: [{ userId }, { isPublic: true }] };

    const where: Prisma.RecipeWhereInput = {
      ...visibilityWhere,
      ...(category ? { category } : {}),
      ...(cuisineType ? { cuisineType } : {}),
      ...(source ? { source } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(tags && tags.length
        ? { tags: { hasSome: tags.map((t) => t.trim()) } }
        : {}),
      ...(allergens && allergens.length
        ? { allergens: { hasSome: allergens } }
        : {}),
      ...(dietaryLabels && dietaryLabels.length
        ? { dietaryLabels: { hasSome: dietaryLabels.map((d) => d.trim()) } }
        : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    try {
      const result = await this.recipeRepository.findWithPagination({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      });

      return plainToInstance(
        MultipleRecipeResponseDto,
        {
          data: result.data.map((recipe) => this.toResponse(recipe)),
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        { excludeExtraneousValues: true },
      );
    } catch (error) {
      throw handlePrismaError(error, 'find recipes', 'Recipe');
    }
  }

  async findOne(id: string, userId: string): Promise<RecipeResponseDto> {
    const recipe = await this.recipeRepository.findById(id);

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Allow access if user owns it OR if it's public
    const canAccess = recipe.userId === userId || recipe.isPublic === true;
    if (!canAccess) {
      throw new ForbiddenException('Access denied to this recipe');
    }

    return this.toResponse(recipe);
  }

  async update(
    id: string,
    updateRecipeDto: UpdateRecipeDto,
    userId: string,
  ): Promise<RecipeResponseDto> {
    await this.getOwnedRecipeOrThrow(id, userId);

    try {
      const updated = await this.recipeRepository.update(id, updateRecipeDto);
      return this.toResponse(updated);
    } catch (error) {
      throw handlePrismaError(error, 'update recipe', 'Recipe');
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getOwnedRecipeOrThrow(id, userId);
    try {
      await this.recipeRepository.delete(id);
    } catch (error) {
      throw handlePrismaError(error, 'delete recipe', 'Recipe');
    }
  }

  private toResponse(recipe: any): RecipeResponseDto {
    return plainToInstance(RecipeResponseDto, recipe, {
      excludeExtraneousValues: true,
    });
  }
}
