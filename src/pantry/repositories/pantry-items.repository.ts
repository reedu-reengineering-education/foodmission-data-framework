import { Injectable } from '@nestjs/common';
import { Prisma, Unit } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type PantryItemWithRelations = Prisma.PantryItemGetPayload<{
  include: {
    pantry: true;
    food: true;
    foodCategory: true;
  };
}>;

export interface PantryItemFilter {
  pantryId?: string;
  foodId?: string;
  foodCategoryId?: string;
  unit?: Unit;
  expiryDate?: Date;
}

export interface CreatePantryItemData {
  pantryId: string;
  foodId?: string | null;
  foodCategoryId?: string | null;
  itemType: string;
  quantity: number;
  unit: Unit;
  notes?: string;
  location?: string;
  expiryDate?: Date;
  expiryDateSource?: 'manual' | 'auto_foodkeeper';
}

@Injectable()
export class PantryItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreatePantryItemData,
    tx?: Prisma.TransactionClient,
  ): Promise<PantryItemWithRelations> {
    const client = tx ?? this.prisma;
    return client.pantryItem.create({
      data: {
        pantryId: data.pantryId,
        foodId: data.foodId,
        foodCategoryId: data.foodCategoryId,
        itemType: data.itemType,
        quantity: data.quantity,
        unit: data.unit,
        notes: data.notes,
        location: data.location,
        expiryDate: data.expiryDate,
        expiryDateSource: data.expiryDateSource,
      },
      include: {
        pantry: true,
        food: true,
        foodCategory: true,
      },
    });
  }

  async findAll(): Promise<PantryItemWithRelations[]> {
    return await this.prisma.pantryItem.findMany({
      include: {
        pantry: true,
        food: true,
        foodCategory: true,
      },
    });
  }

  async findById(id: string): Promise<PantryItemWithRelations | null> {
    return this.prisma.pantryItem.findUnique({
      where: { id },
      include: {
        pantry: true,
        food: true,
        foodCategory: true,
      },
    });
  }

  async findMany(
    filter: PantryItemFilter = {},
  ): Promise<PantryItemWithRelations[]> {
    return this.prisma.pantryItem.findMany({
      where: {
        pantryId: filter.pantryId,
        foodId: filter.foodId,
        foodCategoryId: filter.foodCategoryId,
        expiryDate: filter.expiryDate,
        unit: filter.unit,
      },
      include: {
        pantry: true,
        food: true,
        foodCategory: true,
      },
    });
  }

  /**
   * Find all expired items for a specific user
   * Filters by userId through pantry relation for security
   */
  async findExpiredByUser(
    userId: string,
    currentDate: Date,
  ): Promise<PantryItemWithRelations[]> {
    return await this.prisma.pantryItem.findMany({
      where: {
        expiryDate: {
          lt: currentDate,
        },
        pantry: {
          userId: userId,
        },
      },
      include: {
        pantry: true,
        food: true,
        foodCategory: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.PantryItemUpdateInput,
  ): Promise<PantryItemWithRelations> {
    return this.prisma.pantryItem.update({
      where: { id },
      data,
      include: {
        pantry: true,
        food: true,
        foodCategory: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.pantryItem.delete({
      where: { id },
    });
  }

  async findFoodInPantry(
    pantryId: string,
    foodId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PantryItemWithRelations | null> {
    const client = tx ?? this.prisma;
    return client.pantryItem.findFirst({
      where: {
        pantryId: pantryId,
        foodId: foodId,
      },
      include: {
        pantry: true,
        food: true,
        foodCategory: true,
      },
    });
  }

  async findFoodCategoryInPantry(
    pantryId: string,
    foodCategoryId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PantryItemWithRelations | null> {
    const client = tx ?? this.prisma;
    return client.pantryItem.findFirst({
      where: {
        pantryId: pantryId,
        foodCategoryId: foodCategoryId,
      },
      include: {
        pantry: true,
        food: true,
        foodCategory: true,
      },
    });
  }
}
