import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RecipeRepository } from '../repositories/recipe.repository';
import { DishRepository } from '../../dish/repositories/dish.repository';
import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';
import {
  MultipleRecipeResponseDto,
  RecipeResponseDto,
} from '../dto/recipe-response.dto';
import { QueryRecipeDto } from '../dto/query-recipe.dto';
import { Prisma } from '@prisma/client';
import { getOwnedEntityOrThrow } from '../../common/services/ownership-helpers';

@Injectable()
export class RecipeService {
  private readonly logger = new Logger(RecipeService.name);

  constructor(
    private readonly recipeRepository: RecipeRepository,
    private readonly dishRepository: DishRepository,
  ) {}

  private getOwnedDishOrThrow(dishId: string, userId: string) {
    return getOwnedEntityOrThrow(
      dishId,
      userId,
      (id) => this.dishRepository.findById(id),
      (d) => d.userId,
      'Dish not found',
    );
  }

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

    await this.getOwnedDishOrThrow(createRecipeDto.dishId, userId);

    const recipe = await this.recipeRepository.create({
      ...createRecipeDto,
      userId,
    });
    return this.toResponse(recipe);
  }

  async findAll(
    userId: string,
    query: QueryRecipeDto,
  ): Promise<MultipleRecipeResponseDto> {
    const {
      page = 1,
      limit = 10,
      mealType,
      tags,
      allergens,
      difficulty,
      search,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RecipeWhereInput = {
      userId,
      ...(difficulty ? { difficulty } : {}),
      ...(tags && tags.length
        ? { tags: { hasSome: tags.map((t) => t.trim()) } }
        : {}),
      ...(allergens && allergens.length
        ? { allergens: { hasSome: allergens.map((a) => a.trim()) } }
        : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
      ...(mealType
        ? {
            dish: {
              mealType,
            },
          }
        : {}),
    };

    const result = await this.recipeRepository.findWithPagination({
      skip,
      take: limit,
      where,
      orderBy: { createdAt: 'desc' },
      include: { dish: true },
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
  }

  async findOne(id: string, userId: string): Promise<RecipeResponseDto> {
    const ownedRecipe = await this.getOwnedRecipeOrThrow(id, userId);
    return this.toResponse(ownedRecipe);
  }

  async update(
    id: string,
    updateRecipeDto: UpdateRecipeDto,
    userId: string,
  ): Promise<RecipeResponseDto> {
    const recipe = await this.getOwnedRecipeOrThrow(id, userId);

    if (updateRecipeDto.dishId && updateRecipeDto.dishId !== recipe.dishId) {
      await this.getOwnedDishOrThrow(updateRecipeDto.dishId, userId);
    }

    const updated = await this.recipeRepository.update(id, updateRecipeDto);
    return this.toResponse(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getOwnedRecipeOrThrow(id, userId);
    await this.recipeRepository.delete(id);
  }

  private toResponse(recipe: any): RecipeResponseDto {
    return plainToInstance(RecipeResponseDto, recipe, {
      excludeExtraneousValues: true,
    });
  }
}
