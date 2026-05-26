import { BadRequestException, Injectable } from '@nestjs/common';
import { ShoppingListItem, Prisma } from '@prisma/client';
import {
  ShoppingListItemWithRelations,
  SHOPPING_LIST_ITEM_WITH_RELATIONS_INCLUDE,
} from '../../common/types/prisma-relations';
import { PrismaService } from '../../database/prisma.service';
import { CreateShoppingListItemDto } from '../dto/create-shopping-list-item.dto';
import { UpdateShoppingListItemDto } from '../dto/update-shopping-list-item.dto';
import { BaseRepository } from '../../common/interfaces/base-repository.interface';
import { ShoppingListItemFilter } from '../dto/shopping-list-item-filter.dto';

@Injectable()
export class ShoppingListItemRepository implements BaseRepository<
  ShoppingListItem,
  CreateShoppingListItemDto,
  UpdateShoppingListItemDto
> {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ShoppingListItemUncheckedCreateInput,
  ): Promise<ShoppingListItemWithRelations> {
    return this.prisma.shoppingListItem.create({
      data,
      include: SHOPPING_LIST_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  async findAll(): Promise<ShoppingListItemWithRelations[]> {
    return await this.prisma.shoppingListItem.findMany({
      include: SHOPPING_LIST_ITEM_WITH_RELATIONS_INCLUDE,
      orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findMany(
    filter: ShoppingListItemFilter = {},
  ): Promise<ShoppingListItemWithRelations[]> {
    if (Object.keys(filter).length === 0) {
      return this.findAll();
    }
    return this.prisma.shoppingListItem.findMany({
      where: {
        shoppingListId: filter.shoppingListId,
        foodProductId: filter.foodProductId,
        genericFoodId: filter.genericFoodId,
        checked: filter.checked,
        unit: filter.unit,
        shoppingList: filter.userId ? { userId: filter.userId } : undefined,
      },
      include: SHOPPING_LIST_ITEM_WITH_RELATIONS_INCLUDE,
      orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findByShoppingListId(
    shoppingListId: string,
    userId?: string,
    filter?: Pick<
      ShoppingListItemFilter,
      'foodProductId' | 'genericFoodId' | 'checked' | 'unit'
    >,
    tx?: Prisma.TransactionClient,
  ): Promise<ShoppingListItemWithRelations[]> {
    const whereConditions: Prisma.ShoppingListItemWhereInput = {
      shoppingListId,
      foodProductId: filter?.foodProductId,
      genericFoodId: filter?.genericFoodId,
      checked: filter?.checked,
      unit: filter?.unit,
    };
    if (userId) {
      whereConditions.shoppingList = {
        userId,
      };
    }

    const client = tx ?? this.prisma;
    return client.shoppingListItem.findMany({
      where: whereConditions,
      include: SHOPPING_LIST_ITEM_WITH_RELATIONS_INCLUDE,
      orderBy: [
        { checked: 'asc' }, // Unchecked items first
        { createdAt: 'desc' },
      ],
    });
  }

  async findById(id: string): Promise<ShoppingListItemWithRelations | null> {
    return this.prisma.shoppingListItem.findUnique({
      where: { id },
      include: SHOPPING_LIST_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  async findByShoppingListAndFood(
    shoppingListId: string,
    foodProductId: string,
  ): Promise<ShoppingListItemWithRelations | null> {
    return this.findByShoppingListAndFoodRef(shoppingListId, { foodProductId });
  }

  async findByShoppingListAndFoodRef(
    shoppingListId: string,
    foodRef: {
      foodProductId?: string;
      genericFoodId?: string;
    },
  ): Promise<ShoppingListItemWithRelations | null> {
    const { foodProductId, genericFoodId } = foodRef;
    if (!foodProductId && !genericFoodId) {
      throw new BadRequestException(
        'Either foodProductId or genericFoodId must be provided',
      );
    }
    return this.prisma.shoppingListItem.findFirst({
      where: {
        shoppingListId,
        foodProductId,
        genericFoodId,
      },
      include: SHOPPING_LIST_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  async update(
    id: string,
    data: Prisma.ShoppingListItemUpdateInput,
  ): Promise<ShoppingListItemWithRelations> {
    return this.prisma.shoppingListItem.update({
      where: { id },
      data,
      include: SHOPPING_LIST_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.shoppingListItem.delete({
      where: { id },
    });
  }

  async deleteMany(filter: ShoppingListItemFilter): Promise<{ count: number }> {
    const whereConditions: Prisma.ShoppingListItemWhereInput = {};

    if (filter.shoppingListId) {
      whereConditions.shoppingListId = filter.shoppingListId;
    }

    if (filter.checked !== undefined) {
      whereConditions.checked = filter.checked;
    }

    if (filter.userId) {
      whereConditions.shoppingList = {
        userId: filter.userId,
      };
    }

    return this.prisma.shoppingListItem.deleteMany({
      where: whereConditions,
    });
  }

  async count(filter: ShoppingListItemFilter = {}): Promise<number> {
    const whereConditions: Prisma.ShoppingListItemWhereInput = {};

    if (filter.shoppingListId) {
      whereConditions.shoppingListId = filter.shoppingListId;
    }

    if (filter.foodProductId) {
      whereConditions.foodProductId = filter.foodProductId;
    }
    if (filter.genericFoodId) {
      whereConditions.genericFoodId = filter.genericFoodId;
    }

    if (filter.checked !== undefined) {
      whereConditions.checked = filter.checked;
    }

    if (filter.userId) {
      whereConditions.shoppingList = {
        userId: filter.userId,
      };
    }

    return this.prisma.shoppingListItem.count({
      where: whereConditions,
    });
  }

  async toggleChecked(id: string): Promise<ShoppingListItemWithRelations> {
    // First get the current checked state
    const currentItem = await this.prisma.shoppingListItem.findUnique({
      where: { id },
      select: { checked: true },
    });

    if (!currentItem) {
      throw new Error('Shopping list item not found');
    }

    return this.prisma.shoppingListItem.update({
      where: { id },
      data: {
        checked: !currentItem.checked,
      },
      include: SHOPPING_LIST_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  async clearCheckedItems(
    shoppingListId: string,
    userId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ count: number }> {
    const whereConditions: Prisma.ShoppingListItemWhereInput = {
      shoppingListId,
      checked: true,
    };

    if (userId) {
      whereConditions.shoppingList = {
        userId,
      };
    }

    const client = tx ?? this.prisma;
    return client.shoppingListItem.deleteMany({
      where: whereConditions,
    });
  }

  async markAllAsChecked(
    shoppingListId: string,
    userId?: string,
  ): Promise<{ count: number }> {
    const whereConditions: Prisma.ShoppingListItemWhereInput = {
      shoppingListId,
      checked: false,
    };

    if (userId) {
      whereConditions.shoppingList = {
        userId,
      };
    }

    return this.prisma.shoppingListItem.updateMany({
      where: whereConditions,
      data: {
        checked: true,
      },
    });
  }

  async markAllAsUnchecked(
    shoppingListId: string,
    userId?: string,
  ): Promise<{ count: number }> {
    const whereConditions: Prisma.ShoppingListItemWhereInput = {
      shoppingListId,
      checked: true,
    };

    if (userId) {
      whereConditions.shoppingList = {
        userId,
      };
    }

    return this.prisma.shoppingListItem.updateMany({
      where: whereConditions,
      data: {
        checked: false,
      },
    });
  }

  async validateShoppingListExists(
    shoppingListId: string,
    userId: string,
  ): Promise<boolean> {
    const count = await this.prisma.shoppingList.count({
      where: {
        id: shoppingListId,
        userId: userId,
      },
    });
    return count > 0;
  }
}
