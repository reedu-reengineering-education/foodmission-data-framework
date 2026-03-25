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
} from '../dto/response-pantryItem.dto';
import { QueryPantryItemDto } from '../dto/query-pantryItem.dto';
import { UpdatePantryItemDto } from '../dto/update-pantryItem.dto';
import { PantryService } from './pantries.service';
import { CreateShoppingListItemDto } from '../../shopping-lists/dto/create-shoppingListItem.dto';
import { CreatePantryItemDto } from '../dto/create-pantryItem.dto';
import { FoodCategoriesRepository } from '../../food-category/repositories/food-categories.repository';
import { Prisma, Unit } from '@prisma/client';

@Injectable()
export class PantryItemService {
  private readonly logger = new Logger(PantryItemService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pantryItemRepository: PantryItemRepository,
    private readonly pantryService: PantryService,
    private readonly foodCategoryRepository: FoodCategoriesRepository,
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
  ): Promise<PantryItemResponseDto> {
    try {
      // Get or auto-create user's pantry
      const pantryId = await this.pantryService.validatePantryExists(userId);

      const { foodId, foodCategoryId } = createDto;

      // Validate either food or foodCategory exists
      if (foodId) {
        await this.validateFoodExists(foodId);
        const existingItem = await this.pantryItemRepository.findFoodInPantry(
          pantryId,
          foodId,
          tx,
        );

        if (existingItem) {
          throw new ConflictException(
            'This food item is already in your pantry',
          );
        }
      } else if (foodCategoryId) {
        await this.validateFoodCategoryExists(foodCategoryId);
        const existingItem =
          await this.pantryItemRepository.findFoodCategoryInPantry(
            pantryId,
            foodCategoryId,
            tx,
          );

        if (existingItem) {
          throw new ConflictException(
            'This food category is already in your pantry',
          );
        }
      }

      let expiryDate: Date | undefined;
      if (createDto.expiryDate) {
        expiryDate =
          createDto.expiryDate instanceof Date
            ? createDto.expiryDate
            : new Date(createDto.expiryDate);
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
          pantryId: pantryId,
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
  ): Promise<MultiplePantryItemResponseDto> {
    const { foodId, foodCategoryId, unit, expiryDate } = query;

    // Get or auto-create user's pantry
    const pantryId = await this.pantryService.validatePantryExists(userId);

    if (foodId) {
      await this.validateFoodExists(foodId);
    }

    if (foodCategoryId) {
      await this.validateFoodCategoryExists(foodCategoryId);
    }

    const filter: any = {
      pantryId,
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

  private async validateFoodExists(foodId: string): Promise<void> {
    const food = await this.prisma.food.findUnique({
      where: { id: foodId },
    });

    if (!food) {
      throw new NotFoundException('Food item not found');
    }
  }

  private async validateFoodCategoryExists(
    foodCategoryId: string,
  ): Promise<void> {
    const foodCategory =
      await this.foodCategoryRepository.findById(foodCategoryId);

    if (!foodCategory) {
      throw new NotFoundException(
        `Food category with ID '${foodCategoryId}' not found`,
      );
    }
  }

  async findById(
    id: string,
    userId: string,
    pantryId?: string,
  ): Promise<PantryItemResponseDto> {
    const item = await this.pantryItemRepository.findById(id);

    if (!item) {
      throw new NotFoundException('Pantry item not found');
    }

    if (item.pantry.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this pantry item',
      );
    }

    if (pantryId !== undefined && item.pantryId !== pantryId) {
      throw new NotFoundException('Pantry item not found');
    }

    return this.transformToResponseDto(item);
  }

  async update(
    id: string,
    updateDto: UpdatePantryItemDto,
    userId: string,
    pantryId?: string,
  ): Promise<PantryItemResponseDto> {
    await this.findById(id, userId, pantryId);

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
          expiryDate: expiryDate,
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

  async remove(id: string, userId: string, pantryId?: string): Promise<void> {
    await this.findById(id, userId, pantryId);
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
