import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { handlePrismaError } from '../../common/utils/error.utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ResourceAlreadyExistsException } from '../../common/exceptions/business.exception';
import {
  PantryItemRepository,
  PantryItemWithRelations,
} from '../repositories/pantry-items.repository';
import { plainToClass, plainToInstance } from 'class-transformer';
import { PrismaService } from '../../database/prisma.service';
import {
  MultiplePantryItemResponseDto,
  PantryItemResponseDto,
} from '../dto/response-pantry-item.dto';
import { QueryPantryItemDto } from '../dto/query-pantry-item.dto';
import { UpdatePantryItemDto } from '../dto/update-pantry-item.dto';
import { PantryService } from './pantry.service';
import { CreateShoppingListItemDto } from '../../shopping-lists/dto/create-shopping-list-item.dto';
import { CreatePantryItemDto } from '../dto/create-pantry-item.dto';
import { FoodCategoriesRepository } from '../../food-category/repositories/food-categories.repository';
import { FoodRepository } from '../../foods/repositories/food.repository';
import { Prisma, Unit } from '@prisma/client';
import { ShelfLifeService } from '../../shelf-life/services/shelf-life.service';

@Injectable()
export class PantryItemService {
  private readonly logger = new Logger(PantryItemService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pantryItemRepository: PantryItemRepository,
    private readonly pantryService: PantryService,
    private readonly foodCategoryRepository: FoodCategoriesRepository,
    private readonly foodRepository: FoodRepository,
    private readonly shelfLifeService: ShelfLifeService,
  ) {}

  async createFromShoppingList(
    createShoppingListItemDto: CreateShoppingListItemDto,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PantryItemResponseDto> {
    const { foodId, foodCategoryId } = createShoppingListItemDto;
    if (!foodId && !foodCategoryId) {
      throw new BadRequestException(
        'Either foodId or foodCategoryId is required to add item to pantry from shopping list',
      );
    }
    if (foodId && foodCategoryId) {
      throw new BadRequestException(
        'Provide either foodId or foodCategoryId, not both, to add item to pantry from shopping list',
      );
    }

    const createPantryItemDto = Object.assign(new CreatePantryItemDto(), {
      foodId: foodId ?? undefined,
      foodCategoryId: foodCategoryId ?? undefined,
      quantity: createShoppingListItemDto.quantity,
      unit: createShoppingListItemDto.unit,
    });

    return this.create(createPantryItemDto, userId, tx);
  }

  async create(
    createDto: CreatePantryItemDto,
    userId: string,
    tx?: Prisma.TransactionClient,
    pantryId?: string,
  ): Promise<PantryItemResponseDto> {
    try {
      // Validate pantry exists and belongs to user; auto-create if no pantryId given
      const resolvedPantryId = await this.pantryService.validatePantryExists(
        userId,
        pantryId,
      );

      const { foodId, foodCategoryId } = createDto;

      // Validate either food or foodCategory exists
      let resolvedFoodName: string | null = null;
      let linkedShelfLifeId: string | null = null;
      if (foodId) {
        const food = await this.validateFoodExists(foodId);
        const existingItem = await this.pantryItemRepository.findFoodInPantry(
          resolvedPantryId,
          foodId,
          tx,
        );

        if (existingItem) {
          throw new ConflictException(
            'This food item is already in your pantry',
          );
        }
        resolvedFoodName = food.name;
        linkedShelfLifeId = food.shelfLifeId ?? null;
      } else if (foodCategoryId) {
        const foodCategory =
          await this.validateFoodCategoryExists(foodCategoryId);
        const existingItem =
          await this.pantryItemRepository.findFoodCategoryInPantry(
            resolvedPantryId,
            foodCategoryId,
            tx,
          );

        if (existingItem) {
          throw new ConflictException(
            'This food category is already in your pantry',
          );
        }
        resolvedFoodName = foodCategory.foodName;
        linkedShelfLifeId = foodCategory.shelfLifeId ?? null;
      }

      let expiryDate: Date | undefined;
      let expiryDateSource: 'manual' | 'auto_foodkeeper' | undefined;

      // Step 1: auto-calculate from FK-linked shelf life (O(1) lookup)
      if (linkedShelfLifeId) {
        const shelfLife = await this.prisma.foodShelfLife.findUnique({
          where: { id: linkedShelfLifeId },
        });
        if (shelfLife) {
          const storageType = this.shelfLifeService.inferStorageType(shelfLife);
          const days = this.shelfLifeService.getDaysForStorageType(
            shelfLife,
            storageType,
          );
          if (days !== null) {
            expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + days);
            expiryDateSource = 'auto_foodkeeper';
            this.logger.debug(
              `Expiry from FK shelf life for ${resolvedFoodName}: ${days} days (${storageType}) -> ${expiryDate.toISOString()}`,
            );
          }
        }
      } else if (resolvedFoodName) {
        // Step 2: fallback to fuzzy name match when no FK link exists
        const calcResult =
          await this.shelfLifeService.calculateExpiryDate(resolvedFoodName);
        if (calcResult.expiryDate) {
          expiryDate = calcResult.expiryDate;
          expiryDateSource = 'auto_foodkeeper';
          this.logger.debug(
            `Expiry from fuzzy match for ${resolvedFoodName}: ${expiryDate.toISOString()}`,
          );
        }
      }

      // Step 3: manual date overrides auto-calculated value (user correction)
      if (createDto.expiryDate) {
        expiryDate =
          createDto.expiryDate instanceof Date
            ? createDto.expiryDate
            : new Date(createDto.expiryDate);
        expiryDateSource = 'manual';
      }

      const unit = createDto.unit ?? Unit.PIECES;
      const itemType = foodId ? 'food' : 'food_category';

      const item = await this.pantryItemRepository.create(
        {
          quantity: createDto.quantity,
          unit: unit,
          notes: createDto.notes,
          location: createDto.location,
          expiryDate: expiryDate,
          expiryDateSource: expiryDateSource,
          pantryId: resolvedPantryId,
          foodId: foodId || null,
          foodCategoryId: foodCategoryId || null,
          itemType,
        },
        tx,
      );

      return this.transformToResponseDto(item);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error('Failed to create pantry item:', error);

      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as Prisma.PrismaClientKnownRequestError;
        if (prismaError.code === 'P2002') {
          throw new ConflictException(
            'This food item is already in your pantry',
          );
        }
        if (prismaError.code === 'P2003') {
          throw new BadRequestException(
            'Invalid reference: food or pantry does not exist',
          );
        }
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to create pantry item',
      );
    }
  }

  async findAll(
    query: QueryPantryItemDto,
    userId: string,
    pantryId?: string,
  ): Promise<MultiplePantryItemResponseDto> {
    const { foodId, foodCategoryId, unit, expiryDate } = query;

    // Validate pantry exists and belongs to user; auto-create if no pantryId given
    const resolvedPantryId = await this.pantryService.validatePantryExists(
      userId,
      pantryId,
    );

    if (foodId) {
      await this.validateFoodExists(foodId);
    }

    if (foodCategoryId) {
      await this.validateFoodCategoryExists(foodCategoryId);
    }

    const filter: any = {
      pantryId: resolvedPantryId,
    };

    if (foodId) {
      filter.foodId = foodId;
    }

    if (foodCategoryId) {
      filter.foodCategoryId = foodCategoryId;
    }

    if (unit) {
      filter.unit = unit;
    }

    if (expiryDate) {
      filter.expiryDate =
        expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
    }

    const items = await this.pantryItemRepository.findMany(filter);

    const transformedData = plainToInstance(PantryItemResponseDto, items, {
      excludeExtraneousValues: true,
    });

    return { data: transformedData };
  }

  private async validateFoodExists(foodId: string) {
    const food = await this.foodRepository.findById(foodId);

    if (!food) {
      throw new NotFoundException('Food item not found');
    }

    return food;
  }

  private async validateFoodCategoryExists(foodCategoryId: string) {
    const foodCategory =
      await this.foodCategoryRepository.findById(foodCategoryId);

    if (!foodCategory) {
      throw new NotFoundException(
        `Food category with ID '${foodCategoryId}' not found`,
      );
    }

    return foodCategory;
  }

  async findById(id: string, userId: string): Promise<PantryItemResponseDto> {
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
  }

  async update(
    id: string,
    updateDto: UpdatePantryItemDto,
    userId: string,
  ): Promise<PantryItemResponseDto> {
    await this.findById(id, userId);

    if (updateDto.foodId) {
      await this.validateFoodExists(updateDto.foodId);
    }

    if (updateDto.foodCategoryId) {
      await this.validateFoodCategoryExists(updateDto.foodCategoryId);
    }

    // Prevent setting both foodId and foodCategoryId
    if (updateDto.foodId && updateDto.foodCategoryId) {
      throw new BadRequestException(
        'Only one of foodId or foodCategoryId can be provided, not both',
      );
    }

    try {
      let expiryDate: Date | undefined;
      if (updateDto.expiryDate !== undefined) {
        expiryDate =
          updateDto.expiryDate instanceof Date
            ? updateDto.expiryDate
            : updateDto.expiryDate
              ? new Date(updateDto.expiryDate)
              : undefined;
      }

      // When switching reference type, clear the other one
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

      if (updateDto.foodId !== undefined) {
        updateData.foodId = updateDto.foodId;
        updateData.foodCategoryId = null;
        updateData.itemType = 'food';
      } else if (updateDto.foodCategoryId !== undefined) {
        updateData.foodCategoryId = updateDto.foodCategoryId;
        updateData.foodId = null;
        updateData.itemType = 'food_category';
      }

      const updatedItem = await this.pantryItemRepository.update(
        id,
        updateData,
      );

      return this.transformToResponseDto(updatedItem);
    } catch (error: any) {
      if (error instanceof PrismaClientKnownRequestError) {
        const businessException = handlePrismaError(
          error,
          'update',
          'pantry_item',
        );

        if (businessException instanceof ResourceAlreadyExistsException) {
          throw new ConflictException(
            'This food item is already in your pantry',
          );
        }

        throw businessException;
      }

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new BadRequestException('Failed to update pantry item');
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);
    await this.pantryItemRepository.delete(id);
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
        foodId: item.foodId,
        foodCategoryId: item.foodCategoryId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        food: item.food,
        foodCategory: item.foodCategory,
      },
      { excludeExtraneousValues: true },
    );
  }
}
