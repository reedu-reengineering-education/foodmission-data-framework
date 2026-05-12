import { Injectable } from '@nestjs/common';
import {
  PantryItemWithRelations,
  PANTRY_ITEM_WITH_RELATIONS_INCLUDE,
} from '../../common/types/prisma-relations';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { CreatePantryItemData } from '../dto/create-pantry-item-data.dto';
import { PantryItemFilter } from '../dto/pantry-item-filter.dto';

@Injectable()
export class PantryItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: CreatePantryItemData,
    tx?: Prisma.TransactionClient,
  ): Promise<PantryItemWithRelations> {
    const client = tx ?? this.prisma;
    return client.pantryItem.create({
      data: {
        pantryId: data.pantryId,
        foodProductId: data.foodProductId,
        genericFoodId: data.genericFoodId,
        itemType: data.itemType,
        quantity: data.quantity,
        unit: data.unit,
        notes: data.notes,
        location: data.location,
        expiryDate: data.expiryDate,
        expiryDateSource: data.expiryDateSource,
      },
      include: PANTRY_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  async findAll(): Promise<PantryItemWithRelations[]> {
    return await this.prisma.pantryItem.findMany({
      include: PANTRY_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  async findById(id: string): Promise<PantryItemWithRelations | null> {
    return await this.prisma.pantryItem.findUnique({
      where: { id },
      include: PANTRY_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  async findMany(
    filter: PantryItemFilter = {},
  ): Promise<PantryItemWithRelations[]> {
    return await this.prisma.pantryItem.findMany({
      where: {
        pantryId: filter.pantryId,
        foodProductId: filter.foodProductId,
        genericFoodId: filter.genericFoodId,
        expiryDate: filter.expiryDate,
        unit: filter.unit,
      },
      include: PANTRY_ITEM_WITH_RELATIONS_INCLUDE,
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
        foodProduct: true,
        genericFood: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.PantryItemUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PantryItemWithRelations> {
    const client = tx ?? this.prisma;
    return await client.pantryItem.update({
      where: { id },
      data,
      include: PANTRY_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.pantryItem.delete({
      where: { id },
    });
  }

  async findFoodProductInPantry(
    pantryId: string,
    foodProductId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PantryItemWithRelations | null> {
    const client = tx ?? this.prisma;
    return await client.pantryItem.findFirst({
      where: {
        pantryId: pantryId,
        foodProductId: foodProductId,
      },
      include: PANTRY_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  async findGenericFoodInPantry(
    pantryId: string,
    genericFoodId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PantryItemWithRelations | null> {
    const client = tx ?? this.prisma;
    return await client.pantryItem.findFirst({
      where: {
        pantryId: pantryId,
        genericFoodId: genericFoodId,
      },
      include: PANTRY_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }
}
export { PantryItemWithRelations };
