import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { FoodWasteRepository } from '../repositories/food-waste.repository';
import { CreateFoodWasteDto } from '../dto/create-food-waste.dto';
import { UpdateFoodWasteDto } from '../dto/update-food-waste.dto';
import { QueryFoodWasteDto } from '../dto/query-food-waste.dto';
import { BatchCreateFoodWasteDto } from '../dto/batch-create-food-waste.dto';
import {
  FoodWasteResponseDto,
  MultipleFoodWasteResponseDto,
  BatchCreateFoodWasteResultDto,
  BatchCreateErrorDto,
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
import { FoodProductRepository } from '../../food-products/repositories/food-product.repository';
import { PrismaService } from '../../database/prisma.service';
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
    private readonly foodProductRepository: FoodProductRepository,
    private readonly prisma: PrismaService,
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
   * Calculate carbon footprint for wasted food by foodId
   * @deprecated Use calculateCarbonFootprintForPantryItem instead
   */
  async calculateCarbonFootprint(
    foodProductId: string,
    quantity: number,
    unit: Unit,
  ): Promise<number> {
    try {
      const food = await this.foodProductRepository.findById(foodProductId);
      if (!food) {
        this.logger.warn(`Food product not found for carbon calculation: ${foodProductId}`);
        return this.getDefaultCarbonEstimate(quantity, unit);
      }

      return this.calculateCarbonFootprintFromFoodData(
        food.name,
        food.description,
        quantity,
        unit,
      );
    } catch (error) {
      this.logger.error('Error calculating carbon footprint', error);
      return this.getDefaultCarbonEstimate(quantity, unit);
    }
  }

  /**
   * Calculate carbon footprint from a pantry item
   * Handles both food and food category cases
   */
  calculateCarbonFootprintForPantryItem(
    pantryItem: Awaited<ReturnType<typeof this.pantryItemRepository.findById>>,
    quantity: number,
    unit: Unit,
  ): number {
    // If pantry item has a food product, use the food-based calculation
    if (pantryItem?.foodProduct) {
      return this.calculateCarbonFootprintFromFoodData(
        pantryItem.foodProduct.name,
        pantryItem.foodProduct.description,
        quantity,
        unit,
      );
    }

    // If pantry item has a generic food, use category name for estimation
    if (pantryItem?.genericFood) {
      return this.calculateCarbonFootprintFromFoodData(
        pantryItem.genericFood.foodName,
        pantryItem.genericFood.foodGroup,
        quantity,
        unit,
      );
    }

    // Fallback to default estimate
    return this.getDefaultCarbonEstimate(quantity, unit);
  }

  /**
   * Calculate carbon footprint from food name and description
   */
  private calculateCarbonFootprintFromFoodData(
    name: string,
    description: string | null | undefined,
    quantity: number,
    unit: Unit,
  ): number {
    // Convert quantity to kg
    const quantityInKg = quantity * UNIT_TO_KG_CONVERSION[unit];

    const foodName = name.toLowerCase();
    const foodDesc = (description || '').toLowerCase();
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
   * Convert quantity from one unit to another (for compatible units)
   * Returns quantity in target unit, or null if units are incompatible
   */
  private convertQuantity(
    quantity: number,
    fromUnit: Unit,
    toUnit: Unit,
  ): number | null {
    // Same unit - no conversion needed
    if (fromUnit === toUnit) {
      return quantity;
    }

    // Mass units (KG, G)
    const massUnits: Unit[] = [Unit.KG, Unit.G];
    if (massUnits.includes(fromUnit) && massUnits.includes(toUnit)) {
      const inKg = quantity * UNIT_TO_KG_CONVERSION[fromUnit];
      return inKg / UNIT_TO_KG_CONVERSION[toUnit];
    }

    // Volume units (L, ML)
    const volumeUnits: Unit[] = [Unit.L, Unit.ML];
    if (volumeUnits.includes(fromUnit) && volumeUnits.includes(toUnit)) {
      const inL = quantity * UNIT_TO_KG_CONVERSION[fromUnit]; // Uses same conversion factor
      return inL / UNIT_TO_KG_CONVERSION[toUnit];
    }

    // Incompatible units (e.g., KG to PIECES)
    return null;
  }

  /**
   * Create a food waste entry from a pantry item
   * Derives food info from the pantry item
   * Supports partial or full waste - deletes pantry item only if fully wasted
   */
  async create(
    createDto: CreateFoodWasteDto,
    userId: string,
  ): Promise<FoodWasteResponseDto> {
    try {
      // Load pantry item with relations
      const pantryItem = await this.pantryItemRepository.findById(
        createDto.pantryItemId,
      );
      if (!pantryItem) {
        throw new NotFoundException('Pantry item not found');
      }

      // Validate pantry ownership - security check
      if (pantryItem.pantry.userId !== userId) {
        throw new ForbiddenException(
          'Cannot create waste entry for pantry item that does not belong to you',
        );
      }

      // Derive food info from pantry item
      const foodProductId = pantryItem.foodProductId ?? undefined;
      const genericFoodId = pantryItem.genericFoodId ?? undefined;

      // Use provided quantity/unit or default to full pantry item
      const quantity = createDto.quantity ?? pantryItem.quantity;
      const unit = createDto.unit ?? pantryItem.unit;
      const wastedAt = createDto.wastedAt
        ? new Date(createDto.wastedAt)
        : new Date();

      // Calculate carbon footprint if not provided
      let carbonFootprint = createDto.carbonFootprint;
      if (carbonFootprint === undefined) {
        carbonFootprint = this.calculateCarbonFootprintForPantryItem(
          pantryItem,
          quantity,
          unit,
        );
      }

      const waste = await this.prisma.$transaction(async (tx) => {
        // Create the waste entry
        const createdWaste = await this.foodWasteRepository.create(
          {
            userId,
            pantryItemId: createDto.pantryItemId,
            foodProductId,
            genericFoodId,
            quantity,
            unit,
            wasteReason: createDto.wasteReason,
            detectionMethod: createDto.detectionMethod,
            notes: createDto.notes,
            costEstimate: createDto.costEstimate,
            carbonFootprint,
            wastedAt,
          },
          tx,
        );

        // Determine if we should delete or reduce the pantry item
        const wastedQuantityInPantryUnit = this.convertQuantity(
          quantity,
          unit,
          pantryItem.unit,
        );

        if (wastedQuantityInPantryUnit === null) {
          // Incompatible units - delete entire pantry item (conservative approach)
          this.logger.warn(
            `Incompatible units: waste ${unit}, pantry ${pantryItem.unit}. Deleting pantry item.`,
          );
          await this.pantryItemRepository.delete(pantryItem.id, tx);
        } else if (wastedQuantityInPantryUnit >= pantryItem.quantity) {
          // Full waste - delete pantry item
          this.logger.log(
            `Full waste recorded for pantry item ${pantryItem.id}. Deleting item.`,
          );
          await this.pantryItemRepository.delete(pantryItem.id, tx);
        } else {
          // Partial waste - reduce pantry item quantity
          const newQuantity = pantryItem.quantity - wastedQuantityInPantryUnit;
          this.logger.log(
            `Partial waste: reducing pantry item ${pantryItem.id} from ${pantryItem.quantity} to ${newQuantity} ${pantryItem.unit}`,
          );
          await this.pantryItemRepository.update(
            pantryItem.id,
            { quantity: newQuantity },
            tx,
          );
        }

        return createdWaste;
      });

      return this.toResponse(waste);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof ForbiddenException) {
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
      foodProductId,
      pantryItemId,
      wasteReason,
      detectionMethod,
      dateFrom,
      dateTo,
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.FoodWasteWhereInput = {
      userId,
      ...(foodProductId ? { foodProductId } : {}),
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
        include: { foodProduct: true, pantryItem: true },
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

    // If food product ID is being changed, validate it exists
    if (updateDto.foodProductId && updateDto.foodProductId !== waste.foodProductId) {
      const food = await this.foodProductRepository.findById(updateDto.foodProductId);
      if (!food) {
        throw new NotFoundException('Food product not found');
      }
    }

    // Recalculate carbon if quantity/unit/food changed and carbon not provided
    let carbonFootprint = updateDto.carbonFootprint;
    if (
      carbonFootprint === undefined &&
      (updateDto.quantity !== undefined ||
        updateDto.unit !== undefined ||
        updateDto.foodProductId !== undefined)
    ) {
      const finalFoodProductId = updateDto.foodProductId ?? waste.foodProductId;
      const finalQuantity = updateDto.quantity ?? waste.quantity;
      const finalUnit = updateDto.unit ?? waste.unit;

      // Only recalculate if we have a foodProductId
      if (finalFoodProductId) {
        carbonFootprint = await this.calculateCarbonFootprint(
          finalFoodProductId,
          finalQuantity,
          finalUnit,
        );
      } else {
        // Fall back to default estimate if no foodProductId
        carbonFootprint = this.getDefaultCarbonEstimate(
          finalQuantity,
          finalUnit,
        );
      }
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
   * Batch create food waste entries from expired pantry items
   * User selects which expired items to record as waste
   * Supports partial or full waste - deletes pantry items only if fully wasted
   */
  async batchCreateFromExpired(
    dto: BatchCreateFoodWasteDto,
    userId: string,
  ): Promise<BatchCreateFoodWasteResultDto> {
    const results: FoodWasteResponseDto[] = [];
    const errors: BatchCreateErrorDto[] = [];

    for (const item of dto.items) {
      try {
        // Load pantry item with relations
        const pantryItem = await this.pantryItemRepository.findById(
          item.pantryItemId,
        );

        if (!pantryItem) {
          errors.push({
            pantryItemId: item.pantryItemId,
            error: 'Pantry item not found',
          });
          continue;
        }

        // Validate ownership through pantry.userId
        if (pantryItem.pantry.userId !== userId) {
          errors.push({
            pantryItemId: item.pantryItemId,
            error: 'Not authorized - item does not belong to user',
          });
          continue;
        }

        // Use provided quantity/unit or default to full pantry item
        const quantity = item.quantity ?? pantryItem.quantity;
        const unit = item.unit ?? pantryItem.unit;

        // Calculate carbon footprint using pantry item data
        const carbonFootprint = this.calculateCarbonFootprintForPantryItem(
          pantryItem,
          quantity,
          unit,
        );

        // Use transaction to handle waste creation and pantry update
        const waste = await this.prisma.$transaction(async (tx) => {
          // Create waste entry - supports both food and foodCategory
          const createdWaste = await this.foodWasteRepository.create(
            {
              userId,
              pantryItemId: item.pantryItemId,
              foodId: pantryItem.foodId ?? undefined,
              foodCategoryId: pantryItem.foodCategoryId ?? undefined,
              quantity,
              unit,
              wasteReason: WasteReason.EXPIRED,
              detectionMethod: DetectionMethod.AUTOMATIC,
              costEstimate: item.costEstimate,
              notes: item.notes,
              carbonFootprint,
              wastedAt: new Date(),
            },
            tx,
          );

          // Determine if we should delete or reduce the pantry item
          const wastedQuantityInPantryUnit = this.convertQuantity(
            quantity,
            unit,
            pantryItem.unit,
          );

          if (wastedQuantityInPantryUnit === null) {
            // Incompatible units - delete entire pantry item
            await this.pantryItemRepository.delete(item.pantryItemId, tx);
          } else if (wastedQuantityInPantryUnit >= pantryItem.quantity) {
            // Full waste - delete pantry item
            await this.pantryItemRepository.delete(item.pantryItemId, tx);
          } else {
            // Partial waste - reduce pantry item quantity
            const newQuantity =
              pantryItem.quantity - wastedQuantityInPantryUnit;
            await this.pantryItemRepository.update(
              item.pantryItemId,
              { quantity: newQuantity },
              tx,
            );
          }

          return createdWaste;
        });

        results.push(this.toResponse(waste));
      } catch (error) {
        this.logger.error(
          `Error creating waste for pantry item ${item.pantryItemId}`,
          error,
        );
        errors.push({
          pantryItemId: item.pantryItemId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log summary
    this.logger.log(
      `Batch create: ${results.length} succeeded, ${errors.length} failed`,
    );

    if (errors.length > 0) {
      this.logger.warn('Failed items:', errors);
    }

    return plainToInstance(
      BatchCreateFoodWasteResultDto,
      {
        successes: results,
        errors,
        total: dto.items.length,
        successCount: results.length,
        errorCount: errors.length,
      },
      { excludeExtraneousValues: true },
    );
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
