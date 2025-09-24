import { Injectable } from '@nestjs/common';
import { Prisma, ShoppingListItem } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateShoppingListItemDto } from '../dto/create-soppingListItem.dto';
import { UpdateShoppingListItemDto } from '../dto/update-soppingListItem.dto';
import {
  BaseRepository,
  FindAllOptions,
} from 'src/common/interfaces/base-repository.interface';

export type ShoppingListItemWithRelations = ShoppingListItem & {
  shoppingList: {
    id: string;
    title: string;
    userId: string;
  };
  food: {
    id: string;
    name: string;
    category?: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export interface ShoppingListItemFilter {
  shoppingListId?: string;
  foodId?: string;
  checked?: boolean;
  unit?: string;
  userId?: string;
}

@Injectable()
export class ShoppingListItemRepository
  implements
    BaseRepository<
      ShoppingListItem,
      CreateShoppingListItemDto,
      UpdateShoppingListItemDto
    >
{
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateShoppingListItemDto,
  ): Promise<ShoppingListItemWithRelations> {
    return this.prisma.shoppingListItem.create({
      data,
      include: {
        shoppingList: true,
        food: true,
      },
    });
  }

  findAll(): Promise<
    {
      id: string;
      quantity: number;
      unit: string;
      notes: string | null;
      checked: boolean;
      shoppingListId: string;
      foodId: string;
      createdAt: Date;
      updatedAt: Date;
    }[]
  > {
    throw new Error('Method not implemented.');
  }

  async findMany(
    filter: ShoppingListItemFilter = {},
  ): Promise<ShoppingListItemWithRelations[]> {
    return this.prisma.shoppingListItem.findMany({
      where: {
        shoppingListId: filter.shoppingListId,
        foodId: filter.foodId,
        checked: filter.checked,
        unit: filter.unit
          ? { contains: filter.unit, mode: 'insensitive' }
          : undefined,

        shoppingList: filter.userId ? { userId: filter.userId } : undefined,
      },
      include: {
        shoppingList: true,
        food: true,
      },
      orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findByShoppingListId(
    shoppingListId: string,
    userId?: string,
  ): Promise<ShoppingListItemWithRelations[]> {
    const whereConditions: Prisma.ShoppingListItemWhereInput = {
      shoppingListId,
    };

    // Add user access control if userId provided
    if (userId) {
      whereConditions.shoppingList = {
        userId,
      };
    }

    return this.prisma.shoppingListItem.findMany({
      where: whereConditions,
      include: {
        shoppingList: true,
        food: true,
      },
      orderBy: [
        { checked: 'asc' }, // Unchecked items first
        { createdAt: 'desc' },
      ],
    });
  }

  async findById(id: string): Promise<ShoppingListItemWithRelations | null> {
    return this.prisma.shoppingListItem.findUnique({
      where: { id },
      include: {
        shoppingList: true,
        food: true,
      },
    });
  }

  async findByShoppingListAndFood(
    shoppingListId: string,
    foodId: string,
  ): Promise<ShoppingListItemWithRelations | null> {
    return this.prisma.shoppingListItem.findUnique({
      where: {
        shoppingListId_foodId: {
          shoppingListId,
          foodId,
        },
      },
      include: {
        shoppingList: true,
        food: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.ShoppingListItemUpdateInput,
  ): Promise<ShoppingListItemWithRelations> {
    return this.prisma.shoppingListItem.update({
      where: { id },
      data,
      include: {
        shoppingList: true,
        food: true,
      },
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

    if (filter.foodId) {
      whereConditions.foodId = filter.foodId;
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
      include: {
        shoppingList: true,
        food: true,
      },
    });
  }

  async clearCheckedItems(
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

    return this.prisma.shoppingListItem.deleteMany({
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

  async validateFoodExists(foodId: string): Promise<boolean> {
    const count = await this.prisma.food.count({
      where: { id: foodId },
    });
    return count > 0;
  }
}
