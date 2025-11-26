import { Injectable } from '@nestjs/common';
import { Prisma, Unit } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type PantryItemWithRelations = Prisma.PantryItemGetPayload<{
  include: {
    pantry: true;
    food: true;
  };
}>;

export interface PantryItemFilter {
  pantryId?: string;
  foodId?: string;
  unit?: Unit;
  expiryDate?: Date;
}

export interface CreatePantryItemData {
  pantryId: string;
  foodId: string;
  quantity: number;
  unit: Unit;
  notes?: string;
  expiryDate?: Date;
}

@Injectable()
export class PantryItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePantryItemData): Promise<PantryItemWithRelations> {
    return this.prisma.pantryItem.create({
      data: {
        pantryId: data.pantryId,
        foodId: data.foodId,
        quantity: data.quantity,
        unit: data.unit,
        notes: data.notes,
        expiryDate: data.expiryDate,
      },
      include: {
        pantry: true,
        food: true,
      },
    });
  }

  async findAll(): Promise<PantryItemWithRelations[]> {
    return await this.prisma.pantryItem.findMany({
      include: {
        pantry: true,
        food: true,
      },
    });
  }

  async findById(id: string): Promise<PantryItemWithRelations | null> {
    return this.prisma.pantryItem.findUnique({
      where: { id },
      include: {
        pantry: true,
        food: true,
      },
    });
  }

  async findMany(
    filter: PantryItemFilter = {},
  ): Promise<PantryItemWithRelations[]> {
    const where: any = {};

    if (filter.pantryId) {
      where.pantryId = filter.pantryId;
    }
    if (filter.foodId) {
      where.foodId = filter.foodId;
    }
    if (filter.expiryDate) {
      where.expiryDate = filter.expiryDate;
    }
    if (filter.unit) {
      where.unit = filter.unit;
    }

    return this.prisma.pantryItem.findMany({
      where,
      include: {
        pantry: true,
        food: true,
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
  ): Promise<PantryItemWithRelations | null> {
    return this.prisma.pantryItem.findFirst({
      where: {
        pantryId: pantryId,
        foodId: foodId,
      },
      include: {
        pantry: true,
        food: true,
      },
    });
  }
}
