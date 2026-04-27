import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  handlePrismaError,
  handleServiceError,
} from '../../common/utils/error.utils';
import { validateFoodRef } from '../../common/utils/food-ref.util';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ResourceAlreadyExistsException } from '../../common/exceptions/business.exception';
import { CreateShoppingListItemDto } from '../dto/create-shopping-list-item.dto';
import { QueryShoppingListItemDto } from '../dto/query-shopping-list-item.dto';
import {
  MultipleShoppingListItemResponseDto,
  ShoppingListItemResponseDto,
} from '../dto/response-shopping-list-item.dto';
import { UpdateShoppingListItemDto } from '../dto/update-shopping-list-item.dto';
import { plainToInstance } from 'class-transformer';
import { ShoppingListItemRepository } from '../repositories/shopping-list-items.repository';
import { ShoppingListItemWithRelations } from '../../common/types/prisma-relations';
import { FoodProductRepository } from '../../food-products/repositories/food-product.repository';
import { GenericFoodRepository } from '../../generic-foods/repositories/generic-food.repository';
import { ShoppingListRepository } from '../repositories/shopping-lists.repository';
import { sanitizeShoppingListItemFilters } from '../utils/filter-sanitizer';

@Injectable()
export class ShoppingListItemService {
  private static readonly ERROR_MESSAGES = {
    ITEM_ALREADY_EXISTS: 'This food item is already in the shopping list',
    ITEM_NOT_FOUND: 'Shopping list item not found',
    SHOPPING_LIST_NOT_FOUND: 'Shopping list not found',
    SHOPPING_LIST_ACCESS_DENIED: 'You do not have access to this shopping list',
    FOOD_NOT_FOUND: 'Food item not found',
    CREATE_FAILED: 'Failed to create shopping list item',
    UPDATE_FAILED: 'Failed to update shopping list item',
  } as const;

  constructor(
    private readonly shoppingListItemRepository: ShoppingListItemRepository,
    private readonly foodProductRepository: FoodProductRepository,
    private readonly genericFoodRepository: GenericFoodRepository,
    private readonly shoppingListRepository: ShoppingListRepository,
  ) {}

  async create(
    createDto: CreateShoppingListItemDto,
    userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    try {
      await this.validateShoppingListAccess(createDto.shoppingListId, userId);

      // Map CreateShoppingListItemDto to FoodRefDto

      const foodRefDto = {
        foodProductId: createDto.foodProductId,
        genericFoodId: createDto.genericFoodId,
      };
      const { itemType, foodProductId, genericFoodId } =
        validateFoodRef(foodRefDto);

      // Validate the referenced item exists
      if (itemType === 'food_product') {
        if (!foodProductId)
          throw new BadRequestException('foodProductId is required');
        await this.validateFoodProductExists(foodProductId);
        await this.checkForDuplicateItem(
          createDto.shoppingListId,
          foodProductId,
          undefined,
        );
      } else {
        if (!genericFoodId)
          throw new BadRequestException('genericFoodId is required');
        await this.validateGenericFoodExists(genericFoodId);
        await this.checkForDuplicateItem(
          createDto.shoppingListId,
          undefined,
          genericFoodId,
        );
      }

      const item = await this.shoppingListItemRepository.create({
        ...createDto,
        itemType,
        foodProductId,
        genericFoodId,
      });

      return this.transformToResponseDto(item);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        const businessException = handlePrismaError(
          error,
          'create',
          'shopping_list_item',
        );

        if (businessException instanceof ResourceAlreadyExistsException) {
          throw new ConflictException(
            ShoppingListItemService.ERROR_MESSAGES.ITEM_ALREADY_EXISTS,
          );
        }

        throw businessException;
      }

      handleServiceError(
        error,
        ShoppingListItemService.ERROR_MESSAGES.CREATE_FAILED,
      );
    }
  }

  async findAll(
    query: QueryShoppingListItemDto,
  ): Promise<MultipleShoppingListItemResponseDto> {
    const { shoppingListId, foodProductId, genericFoodId, checked, unit } =
      query;

    const items = await this.shoppingListItemRepository.findMany({
      shoppingListId,
      foodProductId,
      genericFoodId,
      checked,
      unit,
    });

    return this.transformMultipleToResponseDto(items);
  }

  async findByShoppingList(
    shoppingListId: string,
    userId: string,
    query?: QueryShoppingListItemDto,
  ): Promise<MultipleShoppingListItemResponseDto> {
    await this.validateShoppingListAccess(shoppingListId, userId);

    const { foodProductId, genericFoodId, checked, unit } =
      sanitizeShoppingListItemFilters(query);

    const items = await this.shoppingListItemRepository.findByShoppingListId(
      shoppingListId,
      userId,
      { foodProductId, genericFoodId, checked, unit },
    );

    return this.transformMultipleToResponseDto(items);
  }

  async findById(
    id: string,
    userId: string,
    shoppingListId?: string,
  ): Promise<ShoppingListItemResponseDto> {
    const item = await this.shoppingListItemRepository.findById(id);

    if (!item) {
      throw new NotFoundException(
        ShoppingListItemService.ERROR_MESSAGES.ITEM_NOT_FOUND,
      );
    }

    if (item.shoppingList.userId !== userId) {
      throw new ForbiddenException(
        ShoppingListItemService.ERROR_MESSAGES.SHOPPING_LIST_ACCESS_DENIED,
      );
    }

    if (
      shoppingListId !== undefined &&
      item.shoppingListId !== shoppingListId
    ) {
      throw new NotFoundException(
        ShoppingListItemService.ERROR_MESSAGES.ITEM_NOT_FOUND,
      );
    }

    return this.transformToResponseDto(item);
  }

  async update(
    id: string,
    updateDto: UpdateShoppingListItemDto,
    userId: string,
    shoppingListId?: string,
  ): Promise<ShoppingListItemResponseDto> {
    await this.findById(id, userId, shoppingListId);

    if (updateDto.foodProductId) {
      await this.validateFoodProductExists(updateDto.foodProductId);
    }

    if (updateDto.shoppingListId) {
      await this.validateShoppingListAccess(updateDto.shoppingListId, userId);
    }

    try {
      const updateData = this.buildUpdateData(updateDto);
      const updatedItem = await this.shoppingListItemRepository.update(
        id,
        updateData,
      );

      return this.transformToResponseDto(updatedItem);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        const businessException = handlePrismaError(
          error,
          'update',
          'shopping_list_item',
        );

        if (businessException instanceof ResourceAlreadyExistsException) {
          throw new ConflictException(
            ShoppingListItemService.ERROR_MESSAGES.ITEM_ALREADY_EXISTS,
          );
        }

        throw businessException;
      }

      handleServiceError(
        error,
        ShoppingListItemService.ERROR_MESSAGES.UPDATE_FAILED,
      );
    }
  }

  async remove(
    id: string,
    userId: string,
    shoppingListId?: string,
  ): Promise<void> {
    try {
      await this.findById(id, userId, shoppingListId);
      await this.shoppingListItemRepository.delete(id);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        const businessException = handlePrismaError(
          error,
          'delete',
          'shopping_list_item',
        );
        throw businessException;
      }

      handleServiceError(error, 'Failed to delete shopping list item');
    }
  }

  async clearCheckedItems(
    shoppingListId: string,
    userId: string,
  ): Promise<void> {
    const prisma = this.shoppingListItemRepository['prisma'];
    try {
      await this.validateShoppingListAccess(shoppingListId, userId);
      await prisma.$transaction(async (tx) => {
        await this.shoppingListItemRepository.clearCheckedItems(
          shoppingListId,
          userId,
          tx,
        );
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        const businessException = handlePrismaError(
          error,
          'clearCheckedItems',
          'shopping_list_item',
        );
        throw businessException;
      }

      handleServiceError(error, 'Failed to clear checked items');
    }
  }

  private async validateShoppingListAccess(
    shoppingListId: string,
    userId: string,
  ): Promise<void> {
    const shoppingList = await this.validateShoppingListExists(shoppingListId);
    this.validateShoppingListOwnership(shoppingList, userId);
  }

  private async validateShoppingListExists(
    shoppingListId: string,
  ): Promise<
    NonNullable<
      Awaited<ReturnType<typeof this.shoppingListRepository.findById>>
    >
  > {
    const shoppingList =
      await this.shoppingListRepository.findById(shoppingListId);

    if (!shoppingList) {
      throw new NotFoundException(
        ShoppingListItemService.ERROR_MESSAGES.SHOPPING_LIST_NOT_FOUND,
      );
    }

    return shoppingList;
  }

  private validateShoppingListOwnership(
    shoppingList: NonNullable<
      Awaited<ReturnType<typeof this.shoppingListRepository.findById>>
    >,
    userId: string,
  ): void {
    if (shoppingList.userId !== userId) {
      throw new ForbiddenException(
        ShoppingListItemService.ERROR_MESSAGES.SHOPPING_LIST_ACCESS_DENIED,
      );
    }
  }

  private async validateFoodProductExists(
    foodProductId: string,
  ): Promise<void> {
    const food = await this.foodProductRepository.findById(foodProductId);

    if (!food) {
      throw new NotFoundException(
        ShoppingListItemService.ERROR_MESSAGES.FOOD_NOT_FOUND,
      );
    }
  }

  private async validateGenericFoodExists(
    genericFoodId: string,
  ): Promise<void> {
    const genericFood =
      await this.genericFoodRepository.findById(genericFoodId);
    if (!genericFood) {
      throw new NotFoundException(
        `Generic food with ID '${genericFoodId}' not found`,
      );
    }
  }

  private async checkForDuplicateItem(
    shoppingListId: string,
    foodProductId?: string,
    genericFoodId?: string,
  ): Promise<void> {
    const existingItem =
      await this.shoppingListItemRepository.findByShoppingListAndFoodRef(
        shoppingListId,
        { foodProductId, genericFoodId },
      );

    if (existingItem) {
      throw new ConflictException(
        ShoppingListItemService.ERROR_MESSAGES.ITEM_ALREADY_EXISTS,
      );
    }
  }

  private transformToResponseDto(
    item: ShoppingListItemWithRelations,
  ): ShoppingListItemResponseDto {
    return plainToInstance(ShoppingListItemResponseDto, item, {
      excludeExtraneousValues: true,
    });
  }

  private transformMultipleToResponseDto(
    items: ShoppingListItemWithRelations[],
  ): MultipleShoppingListItemResponseDto {
    const transformedData = plainToInstance(
      ShoppingListItemResponseDto,
      items,
      { excludeExtraneousValues: true },
    );
    return { data: transformedData };
  }

  private buildUpdateData(
    updateDto: UpdateShoppingListItemDto,
  ): Partial<UpdateShoppingListItemDto> {
    return Object.fromEntries(
      Object.entries(updateDto).filter(([, value]) => value !== undefined),
    ) as Partial<UpdateShoppingListItemDto>;
  }
}
