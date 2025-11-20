import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  handleServiceError,
  ERROR_CODES,
  formatErrorForLogging,
} from '../../common/utils/error.utils';
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
import { FoodRepository } from '../../food/repositories/food.repository';
import { ShoppingListRepository } from '../../shoppingList/repositories/shoppingList.repository';

@Injectable()
export class ShoppingListItemService {
  private readonly logger = new Logger(ShoppingListItemService.name);

  constructor(
    private readonly shoppingListItemRepository: ShoppingListItemRepository,
    private readonly userRepository: UserRepository,
    private readonly pantryItemService: PantryItemService,
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

      const existingItem =
        await this.shoppingListItemRepository.findByShoppingListAndFood(
          createDto.shoppingListId,
          createDto.foodId,
        );

      if (existingItem) {
        throw new ConflictException(
          'This food item is already in the shopping list',
        );
      }

      const item = await this.shoppingListItemRepository.create(createDto);

      return this.transformToResponseDto(item);
    } catch (error) {
      handleServiceError(error, 'Failed to create shopping list item');
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
      throw new NotFoundException('Shopping list item not found');
    }

    if (item.shoppingList.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this shopping list item',
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
      // Handle Prisma unique constraint violation (P2002)
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT
      ) {
        throw new ConflictException(
          'This food item is already in the shopping list',
        );
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

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

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
      throw new NotFoundException('Shopping list not found');
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
        'You do not have access to this shopping list',
      );
    }
  }

  private async validateFoodExists(foodId: string): Promise<void> {
    const food = await this.foodRepository.findById(foodId);

    if (!food) {
      throw new NotFoundException('Food item not found');
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
    if (!willBeChecked || user.checkedShoppingListItemInPantry !== true) {
      return;
    }

    try {
      await this.pantryItemService.createFromShoppingList(
        new CreateShoppingListItemDto(item.foodId, item.quantity, item.unit),
        userId,
      );
    } catch (error) {
      // Log the error but don't fail the toggle operation
      // The item is already checked, which is the primary operation
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
