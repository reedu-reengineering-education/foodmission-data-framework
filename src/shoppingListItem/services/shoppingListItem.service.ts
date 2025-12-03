import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import {
  handlePrismaError,
  handleServiceError,
  formatErrorForLogging,
} from '../../common/utils/error.utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ResourceAlreadyExistsException } from '../../common/exceptions/business.exception';
import { CreateShoppingListItemDto } from '../dto/create-soppingListItem.dto';
import { QueryShoppingListItemDto } from '../dto/query-soppingListItem.dto';
import {
  MultipleShoppingListItemResponseDto,
  ShoppingListItemResponseDto,
} from '../dto/response-soppingListItem.dto';
import { UpdateShoppingListItemDto } from '../dto/update-soppingListItem.dto';
import { plainToInstance } from 'class-transformer';
import {
  ShoppingListItemRepository,
  ShoppingListItemWithRelations,
} from '../repositories/shoppingListItem.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { PantryItemService } from '../../pantryItem/services/pantryItem.service';
import { PantryService } from '../../pantry/services/pantry.service';
import { FoodRepository } from '../../food/repositories/food.repository';
import { ShoppingListRepository } from '../../shoppingList/repositories/shoppingList.repository';

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
    private readonly pantryService: PantryService,
    private readonly foodRepository: FoodRepository,
    private readonly shoppingListRepository: ShoppingListRepository,
  ) {}

  async create(
    createDto: CreateShoppingListItemDto,
    userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    try {
      await this.validateShoppingListAccess(createDto.shoppingListId, userId);
      await this.validateFoodExists(createDto.foodId);
      await this.checkForDuplicateItem(
        createDto.shoppingListId,
        createDto.foodId,
      );

      const item = await this.shoppingListItemRepository.create(createDto);

      return this.transformToResponseDto(item);
    } catch (error) {
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
  ): Promise<MultipleShoppingListItemResponseDto> {
    await this.validateShoppingListAccess(shoppingListId, userId);

    const items = await this.shoppingListItemRepository.findByShoppingListId(
      shoppingListId,
      userId,
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
    } catch (error: any) {
      if (error instanceof PrismaClientKnownRequestError) {
        const businessException = handlePrismaError(
          error,
          'update',
          'shopping_list_item',
        );

        if (businessException instanceof ResourceAlreadyExistsException) {
          throw new ConflictException(
            'This food item is already in the shopping list',
          );
        }

        throw businessException;
      }

      if (error instanceof ConflictException) {
        throw error;
      }

      handleServiceError(error, 'Failed to update shopping list item');
    }
  }

  async toggleChecked(
    id: string,
    userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    const item = await this.findById(id, userId);
    const willBeChecked = !item.checked;

    const user = await this.validateUserExists(userId);

    const updatedItem = await this.shoppingListItemRepository.toggleChecked(id);

    await this.createPantryItemIfEnabled(item, user, userId, willBeChecked);

    return this.transformToResponseDto(updatedItem);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);
    await this.shoppingListItemRepository.delete(id);
  }

  async clearCheckedItems(
    shoppingListId: string,
    userId: string,
  ): Promise<void> {
    await this.validateShoppingListAccess(shoppingListId, userId);
    await this.shoppingListItemRepository.clearCheckedItems(
      shoppingListId,
      userId,
    );
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
    foodId: string,
  ): Promise<void> {
    const existingItem =
      await this.shoppingListItemRepository.findByShoppingListAndFood(
        shoppingListId,
        foodId,
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

  private async createPantryItemIfEnabled(
    item: ShoppingListItemResponseDto,
    user: NonNullable<Awaited<ReturnType<typeof this.userRepository.findById>>>,
    userId: string,
    willBeChecked: boolean,
  ): Promise<void> {
    if (!willBeChecked || user.shouldAutoAddToPantry !== true) {
      return;
    }

    try {
      const pantries = await this.pantryService.getAllPantriesByUserId(userId);
      if (pantries.length === 0) {
        this.logger.warn(
          `Cannot create pantry item from shopping list: No pantry found for user ${userId}`,
        );
        return;
      }

      const pantryId = pantries[0].id;

      await this.pantryItemService.createFromShoppingList(
        new CreateShoppingListItemDto(item.foodId, item.quantity, item.unit),
        userId,
        pantryId,
      );
    } catch (error) {
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
