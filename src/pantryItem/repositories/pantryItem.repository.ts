import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

export type PantryItemWithRelations = Prisma.PantryItemGetPayload<{
  include: {
    pantry: true;
    food: true;
  };
}>;

export interface PantryItemFilter {
  foodId?: string;
  unit?: string;
  location?: string;
  expiryDate?: Date;
}

export interface CreatePantryItemData {
  pantryId: string;
  foodId: string;
  quantity: number;
  unit: string;
  notes?: string;
  location?: string;
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
        location: data.location,
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
    if (Object.keys(filter).length === 0) {
      return this.findAll();
    }
    return this.prisma.pantryItem.findMany({
      where: {
        foodId: filter.foodId,
        location: filter.location,
        expiryDate: filter.expiryDate,
        unit: filter.unit
          ? { contains: filter.unit, mode: 'insensitive' }
          : undefined,
      },
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
