import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { FoodWasteRepository } from '../repositories/food-waste.repository';
import { CreateFoodWasteDto } from '../dto/create-food-waste.dto';
import { UpdateFoodWasteDto } from '../dto/update-food-waste.dto';
import { QueryFoodWasteDto } from '../dto/query-food-waste.dto';
import {
  FoodWasteResponseDto,
  MultipleFoodWasteResponseDto,
} from '../dto/food-waste-response.dto';
import {
  FoodWasteStatisticsDto,
  FoodWasteTrendsDto,
  WasteByReasonDto,
  WasteByMethodDto,
  MostWastedFoodDto,
  WasteTrendDataPointDto,
} from '../dto/food-waste-statistics.dto';
import { PantryItemRepository } from '../../pantry/repositories/pantry-items.repository';
import { FoodRepository } from '../../foods/repositories/food.repository';
import { Prisma, WasteReason, DetectionMethod, Unit } from '@prisma/client';
import { getOwnedEntityOrThrow } from '../../common/services/ownership-helpers';
import { handlePrismaError } from '../../common/utils/error.utils';

/**
 * Carbon footprint estimates in kg CO2 per kg of food
 * Based on ecoscore grades from OpenFoodFacts
 */
export const CARBON_ESTIMATES_BY_ECOSCORE: Record<string, number> = {
  a: 0.5, // Low environmental impact
  b: 1.5,
  c: 3.0,
  d: 5.0,
  e: 8.0, // High environmental impact
};

/**
 * Fallback carbon estimates by food category (kg CO2 per kg)
 */
export const CARBON_ESTIMATES_BY_CATEGORY: Record<string, number> = {
  meat: 7.0,
  poultry: 4.5,
  fish: 3.5,
  dairy: 3.0,
  eggs: 2.5,
  vegetables: 0.5,
  fruits: 0.8,
  grains: 1.0,
  legumes: 0.6,
  oils: 2.0,
  processed: 4.0,
  beverages: 1.5,
  default: 2.5, // Average fallback
};

/**
 * Unit conversion to kg for standardized carbon calculations
 */
export const UNIT_TO_KG_CONVERSION: Record<Unit, number> = {
  KG: 1,
  G: 0.001,
  L: 1, // Approximate (water density)
  ML: 0.001,
  PIECES: 0.25, // Average estimate per piece
  CUPS: 0.24, // Approximate
};

@Injectable()
export class FoodWasteService {
  private readonly logger = new Logger(FoodWasteService.name);

  constructor(
    private readonly foodWasteRepository: FoodWasteRepository,
    private readonly pantryItemRepository: PantryItemRepository,
    private readonly foodRepository: FoodRepository,
  ) {}

  /**
   * Get owned food waste entry or throw
   */
  private async getOwnedFoodWasteOrThrow(id: string, userId: string) {
    return getOwnedEntityOrThrow(
      id,
      userId,
      (id) => this.foodWasteRepository.findById(id),
      (waste) => waste.userId,
      'Food waste entry not found',
    );
  }

  /**
   * Calculate carbon footprint for wasted food
   */
  async calculateCarbonFootprint(
    foodId: string,
    quantity: number,
    unit: Unit,
  ): Promise<number> {
    try {
      const food = await this.foodRepository.findById(foodId);
      if (!food) {
        this.logger.warn(`Food not found for carbon calculation: ${foodId}`);
        return this.getDefaultCarbonEstimate(quantity, unit);
      }

      // Convert quantity to kg
      const quantityInKg = quantity * UNIT_TO_KG_CONVERSION[unit];

      // Try to get carbon estimate from OpenFoodFacts ecoscore
      // Note: This would require fetching OpenFoodFacts data if available
      // For now, use category-based estimates

      // Determine food category from name/description (simplified)
      const foodName = food.name.toLowerCase();
      const foodDesc = (food.description || '').toLowerCase();
      const combinedText = `${foodName} ${foodDesc}`;

      let carbonPerKg = CARBON_ESTIMATES_BY_CATEGORY.default;

      // Simple keyword matching for category detection
      if (/(beef|pork|lamb|meat)/i.test(combinedText)) {
        carbonPerKg = CARBON_ESTIMATES_BY_CATEGORY.meat;
      } else if (/(chicken|turkey|poultry)/i.test(combinedText)) {
        carbonPerKg = CARBON_ESTIMATES_BY_CATEGORY.poultry;
      } else if (/(fish|salmon|tuna|seafood)/i.test(combinedText)) {
        carbonPerKg = CARBON_ESTIMATES_BY_CATEGORY.fish;
      } else if (/(milk|cheese|dairy|yogurt|butter)/i.test(combinedText)) {
        carbonPerKg = CARBON_ESTIMATES_BY_CATEGORY.dairy;
      } else if (/(egg)/i.test(combinedText)) {
        carbonPerKg = CARBON_ESTIMATES_BY_CATEGORY.eggs;
      } else if (
        /(vegetable|lettuce|tomato|carrot|broccoli|spinach)/i.test(combinedText)
      ) {
        carbonPerKg = CARBON_ESTIMATES_BY_CATEGORY.vegetables;
      } else if (/(fruit|apple|banana|orange|berry)/i.test(combinedText)) {
        carbonPerKg = CARBON_ESTIMATES_BY_CATEGORY.fruits;
      } else if (/(rice|bread|pasta|grain|wheat|oat)/i.test(combinedText)) {
        carbonPerKg = CARBON_ESTIMATES_BY_CATEGORY.grains;
      } else if (/(bean|lentil|pea|legume)/i.test(combinedText)) {
        carbonPerKg = CARBON_ESTIMATES_BY_CATEGORY.legumes;
      } else if (/(oil|fat)/i.test(combinedText)) {
        carbonPerKg = CARBON_ESTIMATES_BY_CATEGORY.oils;
      } else if (/(processed|packaged|frozen|canned)/i.test(combinedText)) {
        carbonPerKg = CARBON_ESTIMATES_BY_CATEGORY.processed;
      } else if (/(drink|juice|soda|beverage)/i.test(combinedText)) {
        carbonPerKg = CARBON_ESTIMATES_BY_CATEGORY.beverages;
      }

      const carbonFootprint = quantityInKg * carbonPerKg;
      return Math.round(carbonFootprint * 100) / 100; // Round to 2 decimals
    } catch (error) {
      this.logger.error('Error calculating carbon footprint', error);
      return this.getDefaultCarbonEstimate(quantity, unit);
    }
  }

  /**
   * Get default carbon estimate when food data is unavailable
   */
  private getDefaultCarbonEstimate(quantity: number, unit: Unit): number {
    const quantityInKg = quantity * UNIT_TO_KG_CONVERSION[unit];
    return (
      Math.round(quantityInKg * CARBON_ESTIMATES_BY_CATEGORY.default * 100) /
      100
    );
  }

  /**
   * Create a food waste entry
   */
  async create(
    createDto: CreateFoodWasteDto,
    userId: string,
  ): Promise<FoodWasteResponseDto> {
    try {
      // Validate food exists
      const food = await this.foodRepository.findById(createDto.foodId);
      if (!food) {
        throw new NotFoundException('Food not found');
      }

      // If pantryItemId provided, validate ownership
      if (createDto.pantryItemId) {
        const pantryItem = await this.pantryItemRepository.findById(
          createDto.pantryItemId,
        );
        if (!pantryItem) {
          throw new NotFoundException('Pantry item not found');
        }
        // Validate pantry ownership through pantry
        // This should be done by checking if pantry.userId === userId
        // For now, trusting the controller to handle auth
      }

      // Calculate carbon footprint if not provided
      let carbonFootprint = createDto.carbonFootprint;
      if (carbonFootprint === undefined) {
        carbonFootprint = await this.calculateCarbonFootprint(
          createDto.foodId,
          createDto.quantity,
          createDto.unit,
        );
      }

      const wastedAt = new Date(createDto.wastedAt);

      const waste = await this.foodWasteRepository.create({
        userId,
        pantryItemId: createDto.pantryItemId,
        foodId: createDto.foodId,
        quantity: createDto.quantity,
        unit: createDto.unit,
        wasteReason: createDto.wasteReason,
        detectionMethod: createDto.detectionMethod,
        notes: createDto.notes,
        costEstimate: createDto.costEstimate,
        carbonFootprint,
        wastedAt,
      });

      return this.toResponse(waste);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw handlePrismaError(error, 'create food waste', 'FoodWaste');
    }
  }

  /**
   * Find all food waste entries with filtering and pagination
   */
  async findAll(
    userId: string,
    query: QueryFoodWasteDto,
  ): Promise<MultipleFoodWasteResponseDto> {
    const {
      page = 1,
      limit = 10,
      foodId,
      pantryItemId,
      wasteReason,
      detectionMethod,
      dateFrom,
      dateTo,
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.FoodWasteWhereInput = {
      userId,
      ...(foodId ? { foodId } : {}),
      ...(pantryItemId ? { pantryItemId } : {}),
      ...(wasteReason ? { wasteReason } : {}),
      ...(detectionMethod ? { detectionMethod } : {}),
      ...(dateFrom || dateTo
        ? {
            wastedAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    try {
      const result = await this.foodWasteRepository.findWithPagination({
        skip,
        take: limit,
        where,
        orderBy: { wastedAt: 'desc' },
        include: { food: true, pantryItem: true },
      });

      return plainToInstance(
        MultipleFoodWasteResponseDto,
        {
          data: result.data.map((waste) => this.toResponse(waste)),
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        { excludeExtraneousValues: true },
      );
    } catch (error) {
      throw handlePrismaError(error, 'find food waste entries', 'FoodWaste');
    }
  }

  /**
   * Find one food waste entry by ID
   */
  async findOne(id: string, userId: string): Promise<FoodWasteResponseDto> {
    const waste = await this.getOwnedFoodWasteOrThrow(id, userId);
    return this.toResponse(waste);
  }

  /**
   * Update a food waste entry
   */
  async update(
    id: string,
    updateDto: UpdateFoodWasteDto,
    userId: string,
  ): Promise<FoodWasteResponseDto> {
    const waste = await this.getOwnedFoodWasteOrThrow(id, userId);

    // If food ID is being changed, validate it exists
    if (updateDto.foodId && updateDto.foodId !== waste.foodId) {
      const food = await this.foodRepository.findById(updateDto.foodId);
      if (!food) {
        throw new NotFoundException('Food not found');
      }
    }

    // Recalculate carbon if quantity/unit/food changed and carbon not provided
    let carbonFootprint = updateDto.carbonFootprint;
    if (
      carbonFootprint === undefined &&
      (updateDto.quantity !== undefined ||
        updateDto.unit !== undefined ||
        updateDto.foodId !== undefined)
    ) {
      const finalFoodId = updateDto.foodId || waste.foodId;
      const finalQuantity = updateDto.quantity ?? waste.quantity;
      const finalUnit = updateDto.unit || waste.unit;

      carbonFootprint = await this.calculateCarbonFootprint(
        finalFoodId,
        finalQuantity,
        finalUnit,
      );
    }

    try {
      const updatedWaste = await this.foodWasteRepository.update(id, {
        ...updateDto,
        carbonFootprint,
        wastedAt: updateDto.wastedAt ? new Date(updateDto.wastedAt) : undefined,
      });

      return this.toResponse(updatedWaste);
    } catch (error) {
      throw handlePrismaError(error, 'update food waste', 'FoodWaste');
    }
  }

  /**
   * Delete a food waste entry
   */
  async remove(id: string, userId: string): Promise<void> {
    await this.getOwnedFoodWasteOrThrow(id, userId);

    try {
      await this.foodWasteRepository.delete(id);
    } catch (error) {
      throw handlePrismaError(error, 'delete food waste', 'FoodWaste');
    }
  }

  /**
   * Detect expired items from pantry
   * TODO: Optimize to filter by userId through pantry relation
   */
  async detectExpiredItems(userId: string): Promise<any[]> {
    try {
      // Get all pantry items for the user that have expired
      const now = new Date();

      // We need to get user's pantries first, then items
      // For simplicity, we'll query all pantry items and filter by expiry
      // This should be optimized with proper joins
      const allItems = await this.pantryItemRepository.findAll();

      // Filter for expired items belonging to user's pantries
      // Note: This is simplified - in production, would use proper query with joins
      const expiredItems = allItems.filter((item) => {
        // For now, returning all expired items
        // TODO: Filter by userId through item.pantry.userId === userId
        return item.expiryDate && item.expiryDate < now;
      });

      this.logger.debug(
        `Found ${expiredItems.length} expired items for user ${userId}`,
      );

      return expiredItems.map((item) => ({
        pantryItemId: item.id,
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
        food: item.food,
        suggestedWasteReason: WasteReason.EXPIRED,
        suggestedDetectionMethod: DetectionMethod.AUTOMATIC,
      }));
    } catch (error) {
      this.logger.error('Error detecting expired items', error);
      throw handlePrismaError(error, 'detect expired items', 'PantryItem');
    }
  }

  /**
   * Get statistics for food waste
   */
  async getStatistics(
    userId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<FoodWasteStatisticsDto> {
    try {
      const stats = await this.foodWasteRepository.getStatistics(
        userId,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined,
      );

      // Transform waste by reason into DTO format
      const wasteByReason = Object.entries(stats.wasteByReason).map(
        ([reason, count]) =>
          plainToInstance(
            WasteByReasonDto,
            { reason, count },
            { excludeExtraneousValues: true },
          ),
      );

      // Transform waste by method into DTO format
      const wasteByMethod = Object.entries(stats.wasteByMethod).map(
        ([method, count]) =>
          plainToInstance(
            WasteByMethodDto,
            { method, count },
            { excludeExtraneousValues: true },
          ),
      );

      // Transform most wasted foods
      const mostWastedFoods = stats.mostWastedFoods.map((item) =>
        plainToInstance(MostWastedFoodDto, item, {
          excludeExtraneousValues: true,
        }),
      );

      return plainToInstance(
        FoodWasteStatisticsDto,
        {
          totalWaste: stats.totalWaste,
          totalCost: stats.totalCost,
          totalCarbon: stats.totalCarbon,
          wasteByReason,
          wasteByMethod,
          mostWastedFoods,
          dateFrom,
          dateTo,
        },
        { excludeExtraneousValues: true },
      );
    } catch (error) {
      throw handlePrismaError(error, 'get waste statistics', 'FoodWaste');
    }
  }

  /**
   * Get trends over time
   */
  async getTrends(
    userId: string,
    dateFrom: string,
    dateTo: string,
    interval: 'day' | 'week' | 'month' = 'day',
  ): Promise<FoodWasteTrendsDto> {
    try {
      const trends = await this.foodWasteRepository.getTrends(
        userId,
        new Date(dateFrom),
        new Date(dateTo),
        interval,
      );

      const data = trends.map((point) =>
        plainToInstance(WasteTrendDataPointDto, point, {
          excludeExtraneousValues: true,
        }),
      );

      return plainToInstance(
        FoodWasteTrendsDto,
        {
          data,
          dateFrom,
          dateTo,
          interval,
        },
        { excludeExtraneousValues: true },
      );
    } catch (error) {
      throw handlePrismaError(error, 'get waste trends', 'FoodWaste');
    }
  }

  /**
   * Transform entity to response DTO
   */
  private toResponse(waste: any): FoodWasteResponseDto {
    return plainToInstance(FoodWasteResponseDto, waste, {
      excludeExtraneousValues: true,
    });
  }
}
