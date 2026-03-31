import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PantryService } from '../../pantry/services/pantry.service';
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
  minMatchPercentage?: number;
  limit?: number;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly EXPIRY_BOOST = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pantryService: PantryService,
    private readonly pantryItemRepository: PantryItemRepository,
  ) {}

  async getRecommendations(
    userId: string,
    options: RecommendationOptions = {},
  ): Promise<MultipleRecommendationResponseDto> {
    const {
      expiringWithinDays = 7,
      minMatchPercentage = 30,
      limit = 10,
    } = options;

    // Step 1: Get or create user's pantry
    const pantryId = await this.pantryService.validatePantryExists(userId);

    // Step 2: Get all pantry items
    const allPantryItems = await this.pantryItemRepository.findMany({
      pantryId,
    });

    if (allPantryItems.length === 0) {
      return {
        data: [],
        expiringItemsCount: 0,
        totalPantryItems: 0,
      };
    }

    // Step 3: Get expiring items
    const expiringItems = await this.pantryItemRepository.findExpiringSoon(
      pantryId,
      expiringWithinDays,
    );

    // Step 4: Build lookup sets
    const pantryFoodIds = new Set(
      allPantryItems.filter((i) => i.foodId).map((i) => i.foodId!),
    );
    const pantryCategoryIds = new Set(
      allPantryItems
        .filter((i) => i.foodCategoryId)
        .map((i) => i.foodCategoryId!),
    );
    const expiringFoodIds = new Set(
      expiringItems.filter((i) => i.foodId).map((i) => i.foodId!),
    );
    const expiringCategoryIds = new Set(
      expiringItems
        .filter((i) => i.foodCategoryId)
        .map((i) => i.foodCategoryId!),
    );

    // Step 5: Find candidate recipes
    const candidateRecipes = await this.findCandidateRecipes(
      pantryFoodIds,
      pantryCategoryIds,
    );

    if (candidateRecipes.length === 0) {
      return {
        data: [],
        expiringItemsCount: expiringItems.length,
        totalPantryItems: allPantryItems.length,
      };
    }

    // Step 6: Score recipes
    const scoredRecipes = this.scoreRecipes(
      candidateRecipes,
      allPantryItems,
      pantryFoodIds,
      pantryCategoryIds,
      expiringFoodIds,
      expiringCategoryIds,
    );

    // Step 7: Filter and sort
    const filteredRecipes = scoredRecipes
      .filter((r) => r.matchPercentage >= minMatchPercentage)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);

    // Step 8: Transform to response DTOs
    const data = filteredRecipes.map((scored) =>
      this.toRecommendationResponse(scored),
    );

    return {
      data,
      expiringItemsCount: expiringItems.length,
      totalPantryItems: allPantryItems.length,
    };
  }

  private async findCandidateRecipes(
    pantryFoodIds: Set<string>,
    pantryCategoryIds: Set<string>,
  ): Promise<RecipeWithIngredients[]> {
    const foodIds = Array.from(pantryFoodIds);
    const categoryIds = Array.from(pantryCategoryIds);

    if (foodIds.length === 0 && categoryIds.length === 0) {
      return [];
    }

    const orConditions: any[] = [];
    if (foodIds.length > 0) {
      orConditions.push({ foodId: { in: foodIds } });
    }
    if (categoryIds.length > 0) {
      orConditions.push({ foodCategoryId: { in: categoryIds } });
    }

    return this.prisma.recipe.findMany({
      where: {
        isPublic: true,
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
      const matchPercentage =
        totalIngredients > 0 ? (matchCount / totalIngredients) * 100 : 0;
      const finalScore =
        matchPercentage + expiringMatchCount * this.EXPIRY_BOOST;

      return {
        recipeId: recipe.id,
        recipe,
        matchedIngredients: matches,
        totalIngredients,
        matchCount,
        matchPercentage: Math.round(matchPercentage * 10) / 10,
        expiringMatchCount,
        finalScore: Math.round(finalScore * 10) / 10,
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
        matchPercentage: scored.matchPercentage,
        matchCount: scored.matchCount,
        totalIngredients: scored.totalIngredients,
        expiringMatchCount: scored.expiringMatchCount,
        finalScore: scored.finalScore,
        matchedIngredients,
      },
      { excludeExtraneousValues: true },
    );
  }
}
