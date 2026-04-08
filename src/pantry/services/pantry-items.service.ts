import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    try {
      this.validateFoodOrCategoryInput(
        createShoppingListItemDto.foodId,
        createShoppingListItemDto.foodCategoryId,
      );
      const createPantryItemDto = Object.assign(new CreatePantryItemDto(), {
        foodId: createShoppingListItemDto.foodId ?? undefined,
        foodCategoryId: createShoppingListItemDto.foodCategoryId ?? undefined,
        quantity: createShoppingListItemDto.quantity,
        unit: createShoppingListItemDto.unit,
      });
      return await this.create(createPantryItemDto, userId, tx);
    } catch (err) {
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
      const { foodId, foodCategoryId } = createDto;
      this.validateFoodOrCategoryInput(foodId, foodCategoryId);

      if (createDto.expiryDate) {
        await this.ensureUniqueAndExists(
          resolvedPantryId,
          foodId,
          foodCategoryId,
          tx,
        );
        const item = await this.pantryItemRepository.create(
          {
            quantity: createDto.quantity,
            unit: createDto.unit ?? Unit.PIECES,
            notes: createDto.notes,
            location: createDto.location,
            expiryDate:
              createDto.expiryDate instanceof Date
                ? createDto.expiryDate
                : new Date(createDto.expiryDate),
            expiryDateSource: 'manual',
            pantryId: resolvedPantryId,
            foodId: foodId || null,
            foodCategoryId: foodCategoryId || null,
            itemType: foodId ? 'food' : 'food_category',
          },
          tx,
        );
        return this.transformToResponseDto(item);
      }

      await this.ensureUniqueAndExists(
        resolvedPantryId,
        foodId,
        foodCategoryId,
        tx,
      );

      let resolvedFoodName: string | null = null;
      let linkedShelfLifeId: string | null = null;
      if (foodId) {
        const food = await this.foodRepository.findById(foodId);
        resolvedFoodName = food?.name ?? null;
        linkedShelfLifeId = food?.shelfLifeId ?? null;
      } else if (foodCategoryId) {
        const foodCategory =
          await this.foodCategoryRepository.findById(foodCategoryId);
        resolvedFoodName = foodCategory?.foodName ?? null;
        linkedShelfLifeId = foodCategory?.shelfLifeId ?? null;
      }

      let expiryDate: Date | undefined;
      let expiryDateSource: 'manual' | 'auto_foodkeeper' | undefined;

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
          }
        }
      } else if (resolvedFoodName) {
        const calcResult =
          await this.shelfLifeService.calculateExpiryDate(resolvedFoodName);
        if (calcResult.expiryDate) {
          expiryDate = calcResult.expiryDate;
          expiryDateSource = 'auto_foodkeeper';
        }
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
          foodId: foodId || null,
          foodCategoryId: foodCategoryId || null,
          itemType: foodId ? 'food' : 'food_category',
        },
        tx,
      );
      return this.transformToResponseDto(item);
    } catch (err) {
      throw new BadRequestException(
        'Failed to create pantry item: ' +
          (err instanceof Error ? err.message : err),
      );
    }
  }
  private validateFoodOrCategoryInput(
    foodId?: string,
    foodCategoryId?: string,
  ) {
    if (!foodId && !foodCategoryId) {
      throw new BadRequestException(
        'Either foodId or foodCategoryId is required.',
      );
    }
    if (foodId && foodCategoryId) {
      throw new BadRequestException(
        'Provide either foodId or foodCategoryId, not both.',
      );
    }
  }

  private async ensureUniqueAndExists(
    pantryId: string,
    foodId?: string,
    foodCategoryId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    if (foodId) {
      const food = await this.validateFoodExists(foodId);
      const existingItem = await this.pantryItemRepository.findFoodInPantry(
        pantryId,
        foodId,
        tx,
      );
      if (existingItem) {
        throw new ConflictException('This food item is already in your pantry');
      }
      return food;
    } else if (foodCategoryId) {
      const foodCategory =
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
      return foodCategory;
    }
    throw new BadRequestException(
      'Either foodId or foodCategoryId is required.',
    );
  }

  async findAll(
    query: QueryPantryItemDto,
    userId: string,
    pantryId?: string,
  ): Promise<MultiplePantryItemResponseDto> {
    try {
      const { foodId, foodCategoryId } = query;
      const resolvedPantryId = await this.pantryService.validatePantryExists(
        userId,
        pantryId,
      );
      this.validateFoodOrCategoryInput(foodId, foodCategoryId);
      await this.ensureUniqueAndExists(
        resolvedPantryId,
        foodId,
        foodCategoryId,
      );
      const items = await this.pantryItemRepository.findMany({
        pantryId: resolvedPantryId,
        foodId,
        foodCategoryId,
      });
      return {
        data: plainToInstance(PantryItemResponseDto, items, {
          excludeExtraneousValues: true,
        }),
      };
    } catch (err) {
      throw new BadRequestException(
        'Failed to fetch pantry items: ' +
          (err instanceof Error ? err.message : err),
      );
    }
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
      this.validateFoodOrCategoryInput(
        updateDto.foodId,
        updateDto.foodCategoryId,
      );
      await this.ensureUniqueAndExists(
        item.pantryId,
        updateDto.foodId,
        updateDto.foodCategoryId,
      );
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
    } catch (err) {
      throw new BadRequestException(
        'Failed to update pantry item: ' +
          (err instanceof Error ? err.message : err),
      );
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.findById(id, userId);
      await this.pantryItemRepository.delete(id);
    } catch (err) {
      throw new BadRequestException(
        'Failed to delete pantry item: ' +
          (err instanceof Error ? err.message : err),
      );
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
