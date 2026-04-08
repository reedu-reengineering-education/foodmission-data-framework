import { Injectable, Logger } from '@nestjs/common';
import { PantryService } from '../../pantry/services/pantry.service';
import { RecipesRepository } from '../repositories/recipes.repository';
import {
  PantryItemRepository,
  PantryItemWithRelations,
} from '../../pantry/repositories/pantry-items.repository';
import { plainToInstance } from 'class-transformer';
import {
  IngredientMatch,
  RecipeRecommendationScore,
  RecipeWithIngredients,
} from '../interfaces/recommendation-score.interface';
import {
  MatchedIngredientDto,
  MultipleRecommendationResponseDto,
  RecommendationResponseDto,
} from '../dto/recommendation-response.dto';
import { RecipeResponseDto } from '../dto/recipe-response.dto';

export interface RecommendationOptions {
  expiringWithinDays?: number;
  limit?: number;
  offset?: number;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly pantryService: PantryService,
    private readonly pantryItemRepository: PantryItemRepository,
    private readonly recipesRepository: RecipesRepository,
  ) {}

  async getRecommendations(
    userId: string,
    options: RecommendationOptions = {},
  ): Promise<MultipleRecommendationResponseDto> {
    const { expiringWithinDays = 7, limit = 10, offset = 0 } = options;

    try {
      const pantryId = await this.pantryService.validatePantryExists(userId);

      const allPantryItems = await this.pantryItemRepository.findMany({
        pantryId,
      });

      if (allPantryItems.length === 0) {
        return this.emptyRecommendationResponse(limit, offset);
      }

      const expiringItems = this.getExpiringItems(
        allPantryItems,
        expiringWithinDays,
      );

      const pantryFoodIds = this.buildIdSet(allPantryItems, 'foodId');
      const pantryCategoryIds = this.buildIdSet(
        allPantryItems,
        'foodCategoryId',
      );
      const expiringFoodIds = this.buildIdSet(expiringItems, 'foodId');
      const expiringCategoryIds = this.buildIdSet(
        expiringItems,
        'foodCategoryId',
      );

      const candidateRecipes = await this.findCandidateRecipes(
        pantryFoodIds,
        pantryCategoryIds,
        userId,
        { skip: offset, take: limit },
      );

      if (candidateRecipes.length === 0) {
        return this.emptyRecommendationResponse(
          limit,
          offset,
          allPantryItems.length,
          expiringItems.length,
        );
      }

      const scoredRecipes = this.scoreRecipes(
        candidateRecipes,
        allPantryItems,
        pantryFoodIds,
        pantryCategoryIds,
        expiringFoodIds,
        expiringCategoryIds,
      );

      const sortedRecipes = scoredRecipes.sort(
        (a, b) =>
          b.expiringMatchCount - a.expiringMatchCount ||
          b.matchCount - a.matchCount,
      );

      const data = sortedRecipes.map((scored) =>
        this.toRecommendationResponse(scored),
      );

      return {
        data,
        expiringItemsCount: expiringItems.length,
        totalPantryItems: allPantryItems.length,
        total: sortedRecipes.length,
        offset,
        limit,
        totalPages: Math.ceil(sortedRecipes.length / limit),
        page: Math.floor(offset / limit) + 1,
      };
    } catch (err) {
      this.logger.error(
        `Failed to generate recommendations for user ${userId}: ${err?.message || err}`,
      );
      throw err;
    }
  }

  private emptyRecommendationResponse(
    limit: number,
    offset: number,
    totalPantryItems = 0,
    expiringItemsCount = 0,
  ): MultipleRecommendationResponseDto {
    return {
      data: [],
      expiringItemsCount,
      totalPantryItems,
      total: 0,
      offset,
      limit,
      page: 1,
      totalPages: 1,
    };
  }

  private getExpiringItems(
    items: PantryItemWithRelations[],
    expiringWithinDays: number,
  ): PantryItemWithRelations[] {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + expiringWithinDays);
    return items.filter(
      (i) => i.expiryDate && i.expiryDate >= now && i.expiryDate <= cutoffDate,
    );
  }

  private buildIdSet(
    items: PantryItemWithRelations[],
    key: 'foodId' | 'foodCategoryId',
  ): Set<string> {
    return new Set(items.filter((i) => i[key]).map((i) => i[key]!));
  }

  private async findCandidateRecipes(
    pantryFoodIds: Set<string>,
    pantryCategoryIds: Set<string>,
    userId: string,
    options: { skip?: number; take?: number; orderBy?: any } = {},
  ): Promise<RecipeWithIngredients[]> {
    return this.recipesRepository.findCandidatesForRecommendation(
      Array.from(pantryFoodIds),
      Array.from(pantryCategoryIds),
      userId,
      options,
    );
  }

  private scoreRecipes(
    recipes: RecipeWithIngredients[],
    pantryItems: PantryItemWithRelations[],
    pantryFoodIds: Set<string>,
    pantryCategoryIds: Set<string>,
    expiringFoodIds: Set<string>,
    expiringCategoryIds: Set<string>,
  ): RecipeRecommendationScore[] {
    // Build lookup maps for pantry item names
    const pantryItemByFoodId = new Map<string, PantryItemWithRelations>();
    const pantryItemByCategoryId = new Map<string, PantryItemWithRelations>();
    for (const item of pantryItems) {
      if (item.foodId) pantryItemByFoodId.set(item.foodId, item);
      if (item.foodCategoryId)
        pantryItemByCategoryId.set(item.foodCategoryId, item);
    }

    return recipes.map((recipe) => {
      const matches: IngredientMatch[] = [];

      for (const ingredient of recipe.ingredients) {
        const foodMatch =
          ingredient.foodId && pantryFoodIds.has(ingredient.foodId);
        const categoryMatch =
          ingredient.foodCategoryId &&
          pantryCategoryIds.has(ingredient.foodCategoryId);

        if (foodMatch || categoryMatch) {
          const isExpiring = Boolean(
            (ingredient.foodId && expiringFoodIds.has(ingredient.foodId)) ||
            (ingredient.foodCategoryId &&
              expiringCategoryIds.has(ingredient.foodCategoryId)),
          );

          const pantryItem = ingredient.foodId
            ? pantryItemByFoodId.get(ingredient.foodId)
            : ingredient.foodCategoryId
              ? pantryItemByCategoryId.get(ingredient.foodCategoryId)
              : undefined;

          const daysUntilExpiry = this.calculateDaysUntilExpiry(pantryItem);
          const pantryItemName = this.getPantryItemName(pantryItem);

          matches.push({
            recipeIngredientId: ingredient.id,
            ingredientName: ingredient.name,
            pantryItemId: pantryItem?.id ?? '',
            pantryItemName,
            matchType: foodMatch ? 'exact_food' : 'exact_category',
            isExpiringSoon: isExpiring,
            daysUntilExpiry,
          });
        }
      }

      const totalIngredients = recipe.ingredients.length;
      const matchCount = matches.length;
      const expiringMatchCount = matches.filter((m) => m.isExpiringSoon).length;

      return {
        recipeId: recipe.id,
        recipe,
        matchedIngredients: matches,
        totalIngredients,
        matchCount,
        expiringMatchCount,
      };
    });
  }

  private calculateDaysUntilExpiry(
    pantryItem?: PantryItemWithRelations,
  ): number | null {
    if (!pantryItem?.expiryDate) return null;
    const now = new Date();
    const expiry = new Date(pantryItem.expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getPantryItemName(pantryItem?: PantryItemWithRelations): string {
    if (!pantryItem) return 'Unknown';
    if (pantryItem.food) return pantryItem.food.name;
    if (pantryItem.foodCategory) return pantryItem.foodCategory.foodName;
    return 'Unknown';
  }

  private toRecommendationResponse(
    scored: RecipeRecommendationScore,
  ): RecommendationResponseDto {
    const recipe = plainToInstance(RecipeResponseDto, scored.recipe, {
      excludeExtraneousValues: true,
    });

    const matchedIngredients = scored.matchedIngredients.map((m) =>
      plainToInstance(
        MatchedIngredientDto,
        {
          ingredientName: m.ingredientName,
          pantryItemName: m.pantryItemName,
          isExpiringSoon: m.isExpiringSoon,
          daysUntilExpiry: m.daysUntilExpiry,
        },
        { excludeExtraneousValues: true },
      ),
    );

    return plainToInstance(
      RecommendationResponseDto,
      {
        recipeId: scored.recipeId,
        recipe,
        matchCount: scored.matchCount,
        totalIngredients: scored.totalIngredients,
        expiringMatchCount: scored.expiringMatchCount,
        matchedIngredients,
      },
      { excludeExtraneousValues: true },
    );
  }
}
