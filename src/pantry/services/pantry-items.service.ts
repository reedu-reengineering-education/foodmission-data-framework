import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  handlePrismaError,
  handleServiceError,
} from '../../common/utils/error.utils';
import {
  PantryItemRepository,
  PantryItemWithRelations,
} from '../repositories/pantry-items.repository';
import { plainToClass, plainToInstance } from 'class-transformer';
import {
  MultiplePantryItemResponseDto,
  PantryItemResponseDto,
} from '../dto/response-pantry-item.dto';
import { QueryPantryItemDto } from '../dto/query-pantry-item.dto';
import { UpdatePantryItemDto } from '../dto/update-pantry-item.dto';
import { PantryService } from './pantry.service';
import { CreateShoppingListItemDto } from '../../shopping-lists/dto/create-shopping-list-item.dto';
import { CreatePantryItemDto } from '../dto/create-pantry-item.dto';
import { GenericFoodRepository } from '../../generic-foods/repositories/generic-food.repository';
import { FoodProductRepository } from '../../food-products/repositories/food-product.repository';
import { Prisma, Unit, WasteReason, DetectionMethod } from '@prisma/client';
import { ShelfLifeService } from '../../shelf-life/services/shelf-life.service';
import { ExpiredPantryItemDto } from '../dto/expired-pantry-item.dto';

@Injectable()
export class PantryItemService {
  private readonly logger = new Logger(PantryItemService.name);

  constructor(
    private readonly pantryItemRepository: PantryItemRepository,
    private readonly pantryService: PantryService,
    private readonly genericFoodRepository: GenericFoodRepository,
    private readonly foodProductRepository: FoodProductRepository,
    private readonly shelfLifeService: ShelfLifeService,
  ) {}

  async createFromShoppingList(
    createShoppingListItemDto: CreateShoppingListItemDto,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PantryItemResponseDto> {
    try {
      this.validateFoodRefInput(
        createShoppingListItemDto.foodProductId,
        createShoppingListItemDto.genericFoodId,
      );
      const createPantryItemDto = plainToInstance(CreatePantryItemDto, {
        foodProductId: createShoppingListItemDto.foodProductId ?? undefined,
        genericFoodId: createShoppingListItemDto.genericFoodId ?? undefined,
        quantity: createShoppingListItemDto.quantity,
        unit: createShoppingListItemDto.unit,
      });
      return await this.create(createPantryItemDto, userId, tx);
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ConflictException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException(
        'Failed to create pantry item from shopping list: ' +
          (err instanceof Error ? err.message : err),
      );
    }
  }

  async create(
    createDto: CreatePantryItemDto,
    userId: string,
    tx?: Prisma.TransactionClient,
    pantryId?: string,
  ): Promise<PantryItemResponseDto> {
    try {
      const resolvedPantryId = await this.pantryService.validatePantryExists(
        userId,
        pantryId,
      );
      const { foodProductId, genericFoodId } = createDto;
      this.validateFoodRefInput(foodProductId, genericFoodId);

      const validatedEntity = await this.ensureUniqueAndExists(
        resolvedPantryId,
        foodProductId,
        genericFoodId,
        tx,
      );

      const { foodName, shelfLifeId, categoryHints } = foodId
        ? {
            foodName: (validatedEntity as Food).name ?? null,
            shelfLifeId: (validatedEntity as Food).shelfLifeId ?? null,
            categoryHints: buildCategoryHints(
              (validatedEntity as Food).categories ?? [],
            ),
          }
        : {
            foodName: (validatedEntity as FoodCategory).foodName ?? null,
            shelfLifeId: (validatedEntity as FoodCategory).shelfLifeId ?? null,
            categoryHints: (validatedEntity as FoodCategory).foodGroup
              ? [(validatedEntity as FoodCategory).foodGroup.toLowerCase()]
              : [],
          };
      let resolvedFoodName: string | null = null;
      let linkedShelfLifeId: string | null = null;
      if (foodProductId) {
        const food = await this.foodProductRepository.findById(foodProductId);
        resolvedFoodName = food?.name ?? null;
        linkedShelfLifeId = food?.shelfLifeId ?? null;
      } else if (genericFoodId) {
        const genericFood =
          await this.genericFoodRepository.findById(genericFoodId);
        resolvedFoodName = genericFood?.foodName ?? null;
        linkedShelfLifeId = genericFood?.shelfLifeId ?? null;
      }

      let expiryDate: Date | undefined;
      let expiryDateSource: 'manual' | 'auto_foodkeeper' | undefined;

      const { expiryDate: autoExpiry, source: autoSource } =
        await this.shelfLifeService.resolveExpiryDate({
          shelfLifeId,
          foodName,
          categoryHints,
        });

      let expiryDate: Date | undefined = autoExpiry;
      let expiryDateSource: 'manual' | 'auto_foodkeeper' | undefined =
        autoSource;

      if (!expiryDate && foodName && !createDto.expiryDate) {
        this.logger.warn(
          `No shelf life data for "${foodName}"; expiry date will not be auto-calculated.`,
        );
      }

      // Manual expiry date always takes precedence
      if (createDto.expiryDate) {
        expiryDate =
          createDto.expiryDate instanceof Date
            ? createDto.expiryDate
            : new Date(createDto.expiryDate);
        expiryDateSource = 'manual';
      }

      const item = await this.pantryItemRepository.create(
        {
          quantity: createDto.quantity,
          unit: createDto.unit ?? Unit.PIECES,
          notes: createDto.notes,
          location: createDto.location,
          expiryDate: expiryDate,
          expiryDateSource: expiryDateSource,
          pantryId: resolvedPantryId,
          foodProductId: foodProductId || null,
          genericFoodId: genericFoodId || null,
          itemType: foodProductId ? 'food_product' : 'generic_food',
        },
        tx,
      );
      return this.transformToResponseDto(item);
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ConflictException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException(
        'Failed to create pantry item: ' +
          (err instanceof Error ? err.message : err),
      );
    }
  }

  private validateFoodRefInput(foodProductId?: string, genericFoodId?: string) {
    if (!foodProductId && !genericFoodId) {
      throw new BadRequestException(
        'Either foodProductId or genericFoodId is required.',
      );
    }
    if (foodProductId && genericFoodId) {
      throw new BadRequestException(
        'Provide either foodProductId or genericFoodId, not both.',
      );
    }
  }

  private async ensureUniqueAndExists(
    pantryId: string,
    foodProductId?: string,
    genericFoodId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    if (foodProductId) {
      const food = await this.validateFoodProductExists(foodProductId);
      const existingItem =
        await this.pantryItemRepository.findFoodProductInPantry(
          pantryId,
          foodProductId,
          tx,
        );
      if (existingItem) {
        throw new ConflictException(
          'This food product is already in your pantry',
        );
      }
      return food;
    } else if (genericFoodId) {
      const genericFood = await this.validateGenericFoodExists(genericFoodId);
      const existingItem =
        await this.pantryItemRepository.findGenericFoodInPantry(
          pantryId,
          genericFoodId,
          tx,
        );
      if (existingItem) {
        throw new ConflictException(
          'This generic food is already in your pantry',
        );
      }
      return genericFood;
    }

    throw new Error(
      'Either foodProductId or genericFoodId is required',
    );
  }

  async findAll(
    query: QueryPantryItemDto,
    userId: string,
    pantryId?: string,
  ): Promise<MultiplePantryItemResponseDto> {
    try {
      const { foodProductId, genericFoodId } = query;
      const resolvedPantryId = await this.pantryService.validatePantryExists(
        userId,
        pantryId,
      );
      // Only validate if either filter is provided
      if (foodProductId || genericFoodId) {
        this.validateFoodRefInput(foodProductId, genericFoodId);
        await this.ensureUniqueAndExists(
          resolvedPantryId,
          foodProductId,
          genericFoodId,
        );
      }
      const filter: any = { pantryId: resolvedPantryId };
      if (foodProductId !== undefined) filter.foodProductId = foodProductId;
      if (genericFoodId !== undefined) filter.genericFoodId = genericFoodId;
      if (query.expiryDate !== undefined) {
        filter.expiryDate =
          query.expiryDate instanceof Date
            ? query.expiryDate
            : new Date(query.expiryDate);
      }
      const items = await this.pantryItemRepository.findMany(filter);
      return {
        data: plainToInstance(PantryItemResponseDto, items, {
          excludeExtraneousValues: true,
        }),
      };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ConflictException
      ) {
        throw err;
      }
      throw new BadRequestException(
        'Failed to fetch pantry items: ' +
          (err instanceof Error ? err.message : err),
      );
    }
  }

  private async validateFoodProductExists(foodProductId: string) {
    const food = await this.foodProductRepository.findById(foodProductId);

    if (!food) {
      throw new NotFoundException('Food product not found');
    }

    return food;
  }

  private async validateGenericFoodExists(genericFoodId: string) {
    const genericFood =
      await this.genericFoodRepository.findById(genericFoodId);

    if (!genericFood) {
      throw new NotFoundException(
        `Generic food with ID '${genericFoodId}' not found`,
      );
    }

    return genericFood;
  }

  async findById(id: string, userId: string): Promise<PantryItemResponseDto> {
    try {
      const item = await this.pantryItemRepository.findById(id);
      if (!item) {
        throw new NotFoundException('Pantry item not found');
      }
      if (item.pantry.userId !== userId) {
        throw new ForbiddenException(
          'You do not have access to this pantry item',
        );
      }
      return this.transformToResponseDto(item);
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException(
        'Failed to fetch pantry item: ' +
          (err instanceof Error ? err.message : err),
      );
    }
  }

  async update(
    id: string,
    updateDto: UpdatePantryItemDto,
    userId: string,
  ): Promise<PantryItemResponseDto> {
    try {
      // Fetch the item to get pantryId and validate user access
      const item = await this.pantryItemRepository.findById(id);
      if (!item) {
        throw new NotFoundException('Pantry item not found');
      }
      if (item.pantry.userId !== userId) {
        throw new ForbiddenException(
          'You do not have access to this pantry item',
        );
      }
      const isChangingFoodReference =
        updateDto.foodProductId !== undefined ||
        updateDto.genericFoodId !== undefined;

      if (isChangingFoodReference) {
        this.validateFoodRefInput(
          updateDto.foodProductId,
          updateDto.genericFoodId,
        );
        await this.ensureUniqueAndExists(
          item.pantryId,
          updateDto.foodProductId,
          updateDto.genericFoodId,
        );
      }
      let expiryDate: Date | undefined;
      if (updateDto.expiryDate !== undefined) {
        expiryDate =
          updateDto.expiryDate instanceof Date
            ? updateDto.expiryDate
            : updateDto.expiryDate
              ? new Date(updateDto.expiryDate)
              : undefined;
      }
      const updateData: any = {
        ...(updateDto.quantity !== undefined && {
          quantity: updateDto.quantity,
        }),
        ...(updateDto.unit !== undefined && { unit: updateDto.unit }),
        ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
        ...(updateDto.location !== undefined && {
          location: updateDto.location,
        }),
        ...(expiryDate !== undefined && {
          expiryDate,
          expiryDateSource: 'manual',
        }),
      };
      if (updateDto.foodProductId !== undefined) {
        updateData.foodProductId = updateDto.foodProductId;
        updateData.genericFoodId = null;
        updateData.itemType = 'food_product';
      } else if (updateDto.genericFoodId !== undefined) {
        updateData.genericFoodId = updateDto.genericFoodId;
        updateData.foodProductId = null;
        updateData.itemType = 'generic_food';
      }
      const updatedItem = await this.pantryItemRepository.update(
        id,
        updateData,
      );
      return this.transformToResponseDto(updatedItem);
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ConflictException ||
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      const businessException = handlePrismaError(err, 'update', 'pantry_item');
      if (businessException.name === 'ResourceAlreadyExistsException') {
        throw new ConflictException('This pantry item already exists');
      }
      handleServiceError(
        businessException,
        'Invalid pantry item update payload or value.',
      );
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.findById(id, userId);
      await this.pantryItemRepository.delete(id);
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException(
        'Failed to delete pantry item: ' +
          (err instanceof Error ? err.message : err),
      );
    }
  }

  /**
   * Detect expired items from pantry for the authenticated user
   * Returns suggested food waste entries for expired pantry items
   */
  async detectExpiredItems(
    userId: string,
    pantryId?: string,
  ): Promise<ExpiredPantryItemDto[]> {
    try {
      const resolvedPantryId = await this.pantryService.validatePantryExists(
        userId,
        pantryId,
      );
      const now = new Date();

      // Query expired items with proper userId filtering through pantry relation
      const expiredItems = await this.pantryItemRepository.findExpiredByUser(
        userId,
        now,
      );

      // Filter by pantryId if provided
      const filteredItems = pantryId
        ? expiredItems.filter((item) => item.pantryId === resolvedPantryId)
        : expiredItems;

      this.logger.debug(
        `Found ${filteredItems.length} expired items for user ${userId}${pantryId ? ` in pantry ${resolvedPantryId}` : ''}`,
      );

      return filteredItems.map((item) => ({
        pantryItemId: item.id,
        foodProductId: item.foodProductId,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate as Date, // Query guarantees non-null via lt filter
        food: item.foodProduct,
        suggestedWasteReason: WasteReason.EXPIRED,
        suggestedDetectionMethod: DetectionMethod.AUTOMATIC,
      }));
    } catch (error) {
      this.logger.error('Error detecting expired items', error);
      throw handlePrismaError(error, 'detect expired items', 'PantryItem');
    }
  }

  private transformToResponseDto(
    item: PantryItemWithRelations,
  ): PantryItemResponseDto {
    return plainToClass(
      PantryItemResponseDto,
      {
        id: item.id,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
        location: item.location,
        expiryDate: item.expiryDate,
        expiryDateSource: item.expiryDateSource,
        pantryId: item.pantryId,
        foodProductId: item.foodProductId,
        genericFoodId: item.genericFoodId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        foodProduct: item.foodProduct,
        genericFood: item.genericFood,
      },
      { excludeExtraneousValues: true },
    );
  }
}
