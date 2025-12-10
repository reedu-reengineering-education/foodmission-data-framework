import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class RecipeService {
  private readonly logger = new Logger(RecipeService.name);

  constructor(
    private readonly recipeRepository: RecipeRepository,
    private readonly dishRepository: DishRepository,
  ) {}

  async create(
    createRecipeDto: CreateRecipeDto,
    userId: string,
  ): Promise<RecipeResponseDto> {
    this.logger.log(`Creating recipe ${createRecipeDto.title} for ${userId}`);

    const dish = await this.dishRepository.findById(createRecipeDto.dishId);
    if (!dish) {
      throw new NotFoundException('Dish not found');
    }
    this.ensureOwnership(dish.userId, userId);

    const recipe = await this.recipeRepository.create({
      ...createRecipeDto,
      dishId: createRecipeDto.dishId,
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
    const recipe = await this.recipeRepository.findById(id);
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }
    this.ensureOwnership(recipe.userId, userId);
    return this.toResponse(recipe);
  }

  async update(
    id: string,
    updateRecipeDto: UpdateRecipeDto,
    userId: string,
  ): Promise<RecipeResponseDto> {
    const recipe = await this.recipeRepository.findById(id);
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }
    this.ensureOwnership(recipe.userId, userId);

    if (updateRecipeDto.dishId && updateRecipeDto.dishId !== recipe.dishId) {
      const dish = await this.dishRepository.findById(updateRecipeDto.dishId);
      if (!dish) {
        throw new NotFoundException('Dish not found');
      }
      this.ensureOwnership(dish.userId, userId);
    }

    const updated = await this.recipeRepository.update(id, updateRecipeDto);
    return this.toResponse(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    const recipe = await this.recipeRepository.findById(id);
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }
    this.ensureOwnership(recipe.userId, userId);
    await this.recipeRepository.delete(id);
  }

  private ensureOwnership(ownerId: string, userId: string) {
    if (ownerId !== userId) {
      throw new ForbiddenException('No permission to access this resource');
    }
  }

  private toResponse(recipe: any): RecipeResponseDto {
    return plainToInstance(RecipeResponseDto, recipe, {
      excludeExtraneousValues: true,
    });
  }
}
