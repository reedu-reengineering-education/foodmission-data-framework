import {
  Injectable,
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
import { plainToInstance } from 'class-transformer';
import {
  ShoppingListItemRepository,
  ShoppingListItemWithRelations,
} from '../repositories/shoppingListItem.repository';

@Injectable()
export class ShoppingListItemService {
  logger: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly shoppingListItemRepository: ShoppingListItemRepository,
  ) {}

  async create(
    createDto: CreateShoppingListItemDto,
    userId: string,
  ): Promise<ShoppingListItemResponseDto> {
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

    try {
      // Wichtig: Relationen beim Create mitladen
      const item = await this.prisma.shoppingListItem.create({
        data: {
          quantity: createDto.quantity,
          unit: createDto.unit,
          notes: createDto.notes,
          checked: createDto.checked,
          shoppingListId: createDto.shoppingListId,
          foodId: createDto.foodId,
        },
        include: {
          shoppingList: true,
          food: true,
        },
      });

      return this.transformToResponseDto(item);
    } catch (error) {
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
    this.logger?.log(
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
    const existingItem = await this.findById(id, userId);

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
    await this.findById(id, userId);

    const updatedItem = await this.shoppingListItemRepository.toggleChecked(id);

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
    const shoppingList = await this.prisma.shoppingList.findFirst({
      where: {
        id: shoppingListId,
        userId: userId,
      },
    });

    if (!shoppingList) {
      throw new NotFoundException(
        'Shopping list not found or you do not have access to it',
      );
    }
  }

  private async validateFoodExists(foodId: string): Promise<void> {
    const food = await this.prisma.food.findUnique({
      where: { id: foodId },
    });

    if (!food) {
      throw new NotFoundException('Food item not found');
    }
  }

  private transformToResponseDto(
    item: ShoppingListItemWithRelations,
  ): ShoppingListItemResponseDto {
    return {
      id: item.id,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes ?? undefined,
      checked: item.checked,
      shoppingListId: item.shoppingListId,
      foodId: item.foodId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
