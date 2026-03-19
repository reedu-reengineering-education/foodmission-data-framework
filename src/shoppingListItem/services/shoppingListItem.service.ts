import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  handlePrismaError,
  handleServiceError,
  formatErrorForLogging,
} from '../../common/utils/error.utils';
import { validatePolymorphicItem } from '../../common/utils/polymorphic-item.util';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { User } from '@prisma/client';
import { ResourceAlreadyExistsException } from '../../common/exceptions/business.exception';
import { CreateShoppingListItemDto } from '../dto/create-shoppingListItem.dto';
import { QueryShoppingListItemDto } from '../dto/query-shoppingListItem.dto';
import {
  MultipleShoppingListItemResponseDto,
  ShoppingListItemResponseDto,
} from '../dto/response-shoppingListItem.dto';
import { UpdateShoppingListItemDto } from '../dto/update-shoppingListItem.dto';
import { plainToInstance } from 'class-transformer';
import {
  ShoppingListItemRepository,
  ShoppingListItemWithRelations,
} from '../repositories/shoppingListItem.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { PantryItemService } from '../../pantryItem/services/pantryItem.service';
import { FoodRepository } from '../../food/repositories/food.repository';
import { FoodCategoryRepository } from '../../foodCategory/repositories/food-category.repository';
import { ShoppingListRepository } from '../../shoppingList/repositories/shoppingList.repository';
import { sanitizeShoppingListItemFilters } from '../../shoppingList/utils/filter-sanitizer';

@Injectable()
export class ShoppingListItemService {
  private readonly logger = new Logger(ShoppingListItemService.name);

  private static readonly ERROR_MESSAGES = {
    ITEM_ALREADY_EXISTS: 'This food item is already in the shopping list',
    ITEM_NOT_FOUND: 'Shopping list item not found',
    SHOPPING_LIST_NOT_FOUND: 'Shopping list not found',
    SHOPPING_LIST_ACCESS_DENIED: 'You do not have access to this shopping list',
    FOOD_NOT_FOUND: 'Food item not found',
    USER_NOT_FOUND: 'User not found',
    CREATE_FAILED: 'Failed to create shopping list item',
    UPDATE_FAILED: 'Failed to update shopping list item',
  } as const;

  constructor(
    private readonly shoppingListItemRepository: ShoppingListItemRepository,
    private readonly userRepository: UserRepository,
    private readonly pantryItemService: PantryItemService,
    private readonly foodRepository: FoodRepository,
    private readonly foodCategoryRepository: FoodCategoryRepository,
    private readonly shoppingListRepository: ShoppingListRepository,
  ) {}

  async create(
    createDto: CreateShoppingListItemDto,
    userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    try {
      await this.validateShoppingListAccess(createDto.shoppingListId, userId);

      // Validate polymorphic reference
      const { itemType, foodId, foodCategoryId } =
        validatePolymorphicItem(createDto);

      // Validate the referenced item exists
      if (itemType === 'food') {
        await this.validateFoodExists(foodId!);
        await this.checkForDuplicateItem(
          createDto.shoppingListId,
          foodId,
          undefined,
        );
      } else {
        await this.validateFoodCategoryExists(foodCategoryId!);
        await this.checkForDuplicateItem(
          createDto.shoppingListId,
          undefined,
          foodCategoryId,
        );
      }

      const item = await this.shoppingListItemRepository.create({
        ...createDto,
        itemType,
        foodId,
        foodCategoryId,
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
    const { shoppingListId, foodId, checked, unit } = query;

    const items = await this.shoppingListItemRepository.findMany({
      shoppingListId,
      foodId,
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

    const { foodId, checked, unit } = sanitizeShoppingListItemFilters(query);

    const items = await this.shoppingListItemRepository.findByShoppingListId(
      shoppingListId,
      userId,
      { foodId, checked, unit },
    );

    return this.transformMultipleToResponseDto(items);
  }

  async findById(
    id: string,
    userId: string,
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

    return this.transformToResponseDto(item);
  }

  async update(
    id: string,
    updateDto: UpdateShoppingListItemDto,
    userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    await this.findById(id, userId);

    if (updateDto.foodId) {
      await this.validateFoodExists(updateDto.foodId);
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

  async toggleChecked(
    id: string,
    userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    // Validate user before toggling
    await this.validateUserExists(userId);
    const updatedItem = await this.shoppingListItemRepository.toggleChecked(id);
    return this.transformToResponseDto(updatedItem);
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.findById(id, userId);
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
    try {
      await this.validateShoppingListAccess(shoppingListId, userId);

      const user = await this.validateUserExists(userId);

      if (user.shouldAutoAddToPantry) {
        const checkedItems =
          await this.shoppingListItemRepository.findByShoppingListId(
            shoppingListId,
            userId,
            { checked: true },
          );

        for (const item of checkedItems) {
          if (item.foodId) {
            try {
              const dto = Object.assign(new CreateShoppingListItemDto(), {
                foodId: item.foodId,
                quantity: item.quantity,
                unit: item.unit,
              });
              await this.pantryItemService.createFromShoppingList(dto, userId);
            } catch (error) {
              if (error instanceof ConflictException) {
                this.logger.debug(
                  `Item ${item.foodId} already in pantry, skipping`,
                );
              } else {
                this.logger.warn(
                  formatErrorForLogging(
                    error,
                    `Failed to add item ${item.id} to pantry`,
                  ),
                  error instanceof Error ? error.stack : undefined,
                );
              }
            }
          }
        }
      }

      // Delete all checked items
      await this.shoppingListItemRepository.clearCheckedItems(
        shoppingListId,
        userId,
      );
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

  private async validateFoodExists(foodId: string): Promise<void> {
    const food = await this.foodRepository.findById(foodId);

    if (!food) {
      throw new NotFoundException(
        ShoppingListItemService.ERROR_MESSAGES.FOOD_NOT_FOUND,
      );
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

  private async validateUserExists(
    userId: string,
  ): Promise<
    NonNullable<Awaited<ReturnType<typeof this.userRepository.findById>>>
  > {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(
        ShoppingListItemService.ERROR_MESSAGES.USER_NOT_FOUND,
      );
    }
    return user;
  }

  private async checkForDuplicateItem(
    shoppingListId: string,
    foodId?: string,
    foodCategoryId?: string,
  ): Promise<void> {
    let existingItem;

    if (foodId) {
      existingItem =
        await this.shoppingListItemRepository.findByShoppingListAndFood(
          shoppingListId,
          foodId,
        );
    } else if (foodCategoryId) {
      existingItem =
        await this.shoppingListItemRepository.findByShoppingListAndFoodCategory(
          shoppingListId,
          foodCategoryId,
        );
    }

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

  private async createPantryItemIfEnabled(
    item: ShoppingListItemResponseDto,
    user: User,
    userId: string,
    willBeChecked: boolean,
  ): Promise<void> {
    if (!willBeChecked || user.shouldAutoAddToPantry !== true) {
      return;
    }

    try {
      const dto = item.foodId
        ? Object.assign(new CreateShoppingListItemDto(), {
            foodId: item.foodId,
            quantity: item.quantity,
            unit: item.unit,
          })
        : Object.assign(new CreateShoppingListItemDto(), {
            foodCategoryId: item.foodCategoryId!,
            quantity: item.quantity,
            unit: item.unit,
          });

      await this.pantryItemService.createFromShoppingList(dto, userId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        formatErrorForLogging(
          error,
          `ShoppingListItemService.createPantryItemIfEnabled(itemId: ${item.id}, userId: ${userId})`,
        ),
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
