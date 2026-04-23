import { Injectable } from '@nestjs/common';
import { Prisma, Unit } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type PantryItemWithRelations = Prisma.PantryItemGetPayload<{
  include: {
    pantry: true;
    foodProduct: true;
    genericFood: true;
  };
}>;

export interface PantryItemFilter {
  pantryId?: string;
  foodProductId?: string;
  genericFoodId?: string;
  unit?: Unit;
  expiryDate?: Date;
}

export interface CreatePantryItemData {
  pantryId: string;
  foodProductId?: string | null;
  genericFoodId?: string | null;
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
      include: {
        pantry: true,
        foodProduct: true,
        genericFood: true,
      },
    });
  }

  async findAll(): Promise<PantryItemWithRelations[]> {
    return await this.prisma.pantryItem.findMany({
      include: {
        pantry: true,
        foodProduct: true,
        genericFood: true,
      },
    });
  }

  async findById(id: string): Promise<PantryItemWithRelations | null> {
    return this.prisma.pantryItem.findUnique({
      where: { id },
      include: {
        pantry: true,
        foodProduct: true,
        genericFood: true,
      },
    });
  }

  async findMany(
    filter: PantryItemFilter = {},
  ): Promise<PantryItemWithRelations[]> {
    return this.prisma.pantryItem.findMany({
      where: {
        pantryId: filter.pantryId,
        foodProductId: filter.foodProductId,
        genericFoodId: filter.genericFoodId,
        expiryDate: filter.expiryDate,
        unit: filter.unit,
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
  ): Promise<PantryItemWithRelations> {
    return this.prisma.pantryItem.update({
      where: { id },
      data,
      include: {
        pantry: true,
        foodProduct: true,
        genericFood: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.pantryItem.delete({
      where: { id },
    });
  }

  async findFoodProductInPantry(
    pantryId: string,
    foodProductId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PantryItemWithRelations | null> {
    const client = tx ?? this.prisma;
    return client.pantryItem.findFirst({
      where: {
        pantryId: pantryId,
        foodProductId: foodProductId,
      },
      include: {
        pantry: true,
        foodProduct: true,
        genericFood: true,
      },
    });
  }

  async findGenericFoodInPantry(
    pantryId: string,
    genericFoodId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PantryItemWithRelations | null> {
    const client = tx ?? this.prisma;
    return client.pantryItem.findFirst({
      where: {
        pantryId: pantryId,
        genericFoodId: genericFoodId,
      },
      include: {
        pantry: true,
        foodProduct: true,
        genericFood: true,
      },
    });
  }
}
