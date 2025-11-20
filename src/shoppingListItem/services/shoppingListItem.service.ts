import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateShoppingListItemDto } from '../dto/create-soppingListItem.dto';
import { QueryShoppingListItemDto } from '../dto/query-soppingListItem.dto';
import {
  MultipleShoppingListItemResponseDto,
  ShoppingListItemResponseDto,
} from '../dto/response-soppingListItem.dto';
import { UpdateShoppingListItemDto } from '../dto/update-soppingListItem.dto';
import { plainToClass, plainToInstance } from 'class-transformer';
import {
  ShoppingListItemRepository,
  ShoppingListItemWithRelations,
} from '../repositories/shoppingListItem.repository';
import { FoodResponseDto } from '../../food/dto/food-response.dto';
import { ShoppingListResponseDto } from '../../shoppingList/dto/shoppingList-response.dto';
import { UserRepository } from '../../user/repositories/user.repository';
import { PantryItemService } from '../../pantryItem/services/pantryItem.service';
import { FoodRepository } from '../../food/repositories/food.repository';
import { ShoppingListRepository } from '../../shoppingList/repositories/shoppingList.repository';

@Injectable()
export class ShoppingListItemService {
  private readonly logger = new Logger(ShoppingListItemService.name);

  constructor(
    private readonly prisma: PrismaService,
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
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create shopping list item');
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

    const transformedData = plainToInstance(
      ShoppingListItemResponseDto,
      items,
      { excludeExtraneousValues: true },
    );

    return { data: transformedData };
  }

  async findByShoppingList(
    shoppingListId: string,
    userId: string,
  ): Promise<MultipleShoppingListItemResponseDto> {
    this.logger.log(
      `Finding all shopping list items for list: ${shoppingListId}`,
    );

    await this.validateShoppingListAccess(shoppingListId, userId);

    const items = await this.shoppingListItemRepository.findByShoppingListId(
      shoppingListId,
      userId,
    );

    const transformedData = plainToInstance(
      ShoppingListItemResponseDto,
      items,
      { excludeExtraneousValues: true },
    );

    return { data: transformedData };
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
      const updatedItem = await this.shoppingListItemRepository.update(id, {
        ...(updateDto.quantity !== undefined && {
          quantity: updateDto.quantity,
        }),
        ...(updateDto.unit !== undefined && { unit: updateDto.unit }),
        ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
        ...(updateDto.checked !== undefined && { checked: updateDto.checked }),
        ...(updateDto.shoppingListId !== undefined && {
          shoppingListId: updateDto.shoppingListId,
        }),
        ...(updateDto.foodId !== undefined && { foodId: updateDto.foodId }),
      });

      return this.transformToResponseDto(updatedItem);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'This food item is already in the shopping list',
        );
      }
      throw new BadRequestException('Failed to update shopping list item');
    }
  }

  async toggleChecked(
    id: string,
    userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    // 1. Validate item exists and user has access (also gets current checked state)
    const item = await this.findById(id, userId);
    const willBeChecked = !item.checked;

    // 2. Validate user exists BEFORE any mutations
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 3. Toggle the item
    const updatedItem = await this.shoppingListItemRepository.toggleChecked(id);

    // 4. Only create pantry item if checking (not unchecking) AND user preference is enabled
    if (willBeChecked && user.checkedShoppingListItemInPantry === true) {
      try {
        await this.pantryItemService.createFromShoppingList(
          new CreateShoppingListItemDto(item.foodId, item.quantity, item.unit),
          userId,
        );
      } catch (error) {
        // Log the error but don't fail the toggle operation
        // The item is already checked, which is the primary operation
        this.logger.error(
          `Failed to create pantry item from shopping list item ${id} for user ${userId}`,
          error instanceof Error ? error.stack : String(error),
        );
        // Optionally, you could revert the toggle here if pantry creation is critical
        // For now, we log and continue since the toggle is the primary operation
      }
    }

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
    const shoppingList =
      await this.shoppingListRepository.findById(shoppingListId);

    if (!shoppingList || shoppingList.userId !== userId) {
      throw new NotFoundException(
        'Shopping list not found or you do not have access to it',
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
    return plainToClass(ShoppingListItemResponseDto, {
      id: item.id,
      quantity: item.quantity,
      unit: item.unit,
      notes: null,
      checked: item.checked,
      shoppingListId: item.shoppingListId,
      foodId: item.foodId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      shoppingList: new ShoppingListResponseDto(),
      food: new FoodResponseDto(),
    });
  }
}
