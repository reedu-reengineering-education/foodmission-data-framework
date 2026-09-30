import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RecipesRepository } from '../repositories/recipes.repository';
import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';
import {
  MultipleRecipeResponseDto,
  RecipeResponseDto,
} from '../dto/recipe-response.dto';
import { QueryRecipeDto } from '../dto/query-recipe.dto';
import {
  RateRecipeDto,
  RecipeRatingResponseDto,
} from '../dto/recipe-rating.dto';
import { Prisma, RecipeOrigin } from '@prisma/client';
import { getOwnedEntityOrThrow } from '../../common/services/ownership-helpers';
import { handlePrismaError } from '../../common/utils/error.utils';
import { plainToInstance } from 'class-transformer';
import {
  EventSource,
  EventSubjectType,
  EventType,
} from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';
import { TranslationService } from '../../translations/services/translation.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';

type LocalizableIngredient = {
  name: string;
  genericFoodId?: string | null;
  genericFood?: { foodName: string } | null;
};

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(
    private readonly recipeRepository: RecipesRepository,
    private readonly userEventService: UserEventService,
    private readonly translationService: TranslationService,
  ) {}

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
        isPublic: createRecipeDto.isPublic ?? false,
        origin: RecipeOrigin.USER,
        userId,
      });
      return this.toResponse(recipe);
    } catch (error) {
      throw handlePrismaError(error, 'create recipe', 'Recipe');
    }
  }

  async findMine(
    userId: string,
    query: QueryRecipeDto,
  ): Promise<MultipleRecipeResponseDto> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RecipeWhereInput = {
      userId,
      ...this.buildFiltersWhere(query),
    };

    try {
      const result = await this.recipeRepository.findWithPagination({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      });

      const data = await this.localizeIngredients(result.data, query.lang);

      return plainToInstance(
        MultipleRecipeResponseDto,
        {
          data: data.map((recipe) => this.toResponse(recipe)),
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

  async findAll(
    userId: string,
    query: QueryRecipeDto,
  ): Promise<MultipleRecipeResponseDto> {
    const { page = 1, limit = 10, isPublic } = query;
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
      ...this.buildFiltersWhere(query),
    };

    try {
      const result = await this.recipeRepository.findWithPagination({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      });

      const data = await this.localizeIngredients(result.data, query.lang);

      return plainToInstance(
        MultipleRecipeResponseDto,
        {
          data: data.map((recipe) => this.toResponse(recipe)),
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

  private buildFiltersWhere(query: QueryRecipeDto): Prisma.RecipeWhereInput {
    const {
      category,
      cuisineType,
      dietaryLabels,
      tags,
      allergens,
      difficulty,
      origin,
      search,
    } = query;
    return {
      ...(category ? { category } : {}),
      ...(cuisineType ? { cuisineType } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(origin ? { origin } : {}),
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
  }

  async findOne(
    id: string,
    userId: string,
    lang?: string,
  ): Promise<RecipeResponseDto> {
    const recipe = await this.getVisibleRecipeOrThrow(id, userId);
    await this.recordRecipeExplored(id, userId);
    const [localized] = await this.localizeIngredients([recipe], lang);
    return this.toResponse(localized);
  }

  /**
   * Overlays NEVO translations onto ingredients linked to a generic food:
   * both `genericFood.foodName` and the ingredient `name` take the localized
   * NEVO name. Ingredients without a link, or without a translation row for
   * the locale, keep their stored (English) name.
   */
  private async localizeIngredients<T extends object>(
    recipes: T[],
    lang?: string,
  ): Promise<T[]> {
    const locale = this.translationService.resolveLocale(lang);
    if (locale === DEFAULT_LOCALE) {
      return recipes;
    }

    // Repository methods are typed as bare `Recipe`, but include ingredients.
    const ingredientsOf = (recipe: T) =>
      (recipe as { ingredients?: LocalizableIngredient[] }).ingredients;

    const genericFoodIds = [
      ...new Set(
        recipes.flatMap((recipe) =>
          (ingredientsOf(recipe) ?? [])
            .map((ingredient) => ingredient.genericFoodId)
            .filter((id): id is string => !!id),
        ),
      ),
    ];
    if (genericFoodIds.length === 0) {
      return recipes;
    }

    // No fallbacks: a null foodName means "no translation", so the stored
    // ingredient name wins over the English NEVO name.
    const localized = await this.translationService.resolveMany(
      'GenericFood',
      genericFoodIds,
      locale,
      ['foodName'],
      {},
    );

    return recipes.map((recipe) => ({
      ...recipe,
      ingredients: ingredientsOf(recipe)?.map((ingredient) => {
        const foodName = ingredient.genericFoodId
          ? localized[ingredient.genericFoodId]?.foodName
          : null;
        if (!foodName) {
          return ingredient;
        }
        return {
          ...ingredient,
          name: foodName,
          ...(ingredient.genericFood
            ? { genericFood: { ...ingredient.genericFood, foodName } }
            : {}),
        };
      }),
    }));
  }

  /**
   * Returns the recipe if the user may see it, otherwise throws.
   * Same visibility rule as findOne: owner or public.
   */
  private async getVisibleRecipeOrThrow(id: string, userId: string) {
    const recipe = await this.recipeRepository.findById(id);

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    if (recipe.userId !== userId && recipe.isPublic !== true) {
      throw new ForbiddenException('Access denied to this recipe');
    }

    return recipe;
  }

  async getRating(
    id: string,
    userId: string,
  ): Promise<RecipeRatingResponseDto> {
    const recipe = await this.getVisibleRecipeOrThrow(id, userId);
    const myRating = await this.recipeRepository.findRating(id, userId);

    return this.toRatingResponse({
      recipeId: recipe.id,
      rating: recipe.rating,
      ratingCount: recipe.ratingCount,
      myRating: myRating?.value ?? null,
    });
  }

  async rate(
    id: string,
    rateRecipeDto: RateRecipeDto,
    userId: string,
  ): Promise<RecipeRatingResponseDto> {
    await this.getVisibleRecipeOrThrow(id, userId);

    try {
      const aggregate = await this.recipeRepository.upsertRating(
        id,
        userId,
        rateRecipeDto.value,
      );
      return this.toRatingResponse(aggregate);
    } catch (error) {
      throw handlePrismaError(error, 'rate recipe', 'Recipe');
    }
  }

  async removeRating(
    id: string,
    userId: string,
  ): Promise<RecipeRatingResponseDto> {
    await this.getVisibleRecipeOrThrow(id, userId);

    try {
      const aggregate = await this.recipeRepository.deleteRating(id, userId);

      if (!aggregate) {
        throw new NotFoundException('Rating not found');
      }

      return this.toRatingResponse(aggregate);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw handlePrismaError(error, 'delete recipe rating', 'Recipe');
    }
  }

  /**
   * Records the first time a user opens a given recipe.
   *
   * Keyed on (user, recipe), so re-opening the same recipe replays instead of
   * appending — this is a "which recipes has this user seen" fact, which is
   * what the "Chef" badge counts, not a view counter. Per-view analytics would
   * need a separate event with a different key.
   *
   * Best-effort: reading a recipe must not fail because the ledger did.
   */
  private async recordRecipeExplored(
    recipeId: string,
    userId: string,
  ): Promise<void> {
    await this.userEventService.recordBestEffort({
      userId,
      eventType: EventType.LEARNING_RECIPE_EXPLORED,
      source: EventSource.RECIPE,
      metadata: { recipeId, source: EventSource.API },
      subject: { type: EventSubjectType.RECIPE, id: recipeId },
      idempotencyKey: `recipe-explored:${userId}:${recipeId}`,
    });
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

  private toRatingResponse(rating: {
    recipeId: string;
    rating: number;
    ratingCount: number;
    myRating: number | null;
  }): RecipeRatingResponseDto {
    return plainToInstance(RecipeRatingResponseDto, rating, {
      excludeExtraneousValues: true,
    });
  }

  private toResponse(recipe: any): RecipeResponseDto {
    return plainToInstance(RecipeResponseDto, recipe, {
      excludeExtraneousValues: true,
    });
  }
}
