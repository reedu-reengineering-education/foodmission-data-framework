import { Injectable } from '@nestjs/common';
import { MealItem } from '@prisma/client';
import {
  MealItemWithRelations,
  MEAL_ITEM_WITH_RELATIONS_INCLUDE,
} from '../../../common/types/prisma-relations';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateMealItemDto } from '../dto/create-meal-item.dto';
import { UpdateMealItemDto } from '../dto/update-meal-item.dto';
import { BaseRepository } from '../../../common/interfaces/base-repository.interface';

@Injectable()
export class MealItemRepository implements BaseRepository<
  MealItem,
  CreateMealItemDto,
  UpdateMealItemDto
> {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.MealItemUncheckedCreateInput,
  ): Promise<MealItemWithRelations> {
    return this.prisma.mealItem.create({
      data,
      include: MEAL_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  findAll(): Promise<MealItemWithRelations[]> {
    return this.prisma.mealItem.findMany({
      include: MEAL_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  count(): Promise<number> {
    return this.prisma.mealItem.count();
  }

  findByMealId(mealId: string): Promise<MealItemWithRelations[]> {
    return this.prisma.mealItem.findMany({
      where: { mealId },
      include: MEAL_ITEM_WITH_RELATIONS_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(id: string): Promise<MealItemWithRelations | null> {
    return this.prisma.mealItem.findUnique({
      where: { id },
      include: MEAL_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  findByMealAndFoodProduct(
    mealId: string,
    foodProductId: string,
  ): Promise<MealItemWithRelations | null> {
    return this.prisma.mealItem.findFirst({
      where: {
        mealId,
        foodProductId,
      },
      include: MEAL_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  findByMealAndGenericFood(
    mealId: string,
    genericFoodId: string,
  ): Promise<MealItemWithRelations | null> {
    return this.prisma.mealItem.findFirst({
      where: {
        mealId,
        genericFoodId,
      },
      include: MEAL_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  async checkForDuplicateItem(
    mealId: string,
    opts: { foodProductId?: string; genericFoodId?: string },
  ): Promise<MealItemWithRelations | null> {
    const { foodProductId, genericFoodId } = opts;
    if (foodProductId) {
      return this.findByMealAndFoodProduct(mealId, foodProductId);
    } else if (genericFoodId) {
      return this.findByMealAndGenericFood(mealId, genericFoodId);
    }
    return null;
  }

  update(
    id: string,
    data: Prisma.MealItemUpdateInput,
  ): Promise<MealItemWithRelations> {
    return this.prisma.mealItem.update({
      where: { id },
      data,
      include: MEAL_ITEM_WITH_RELATIONS_INCLUDE,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.mealItem.delete({
      where: { id },
    });
  }

  async deleteByMealId(mealId: string): Promise<void> {
    await this.prisma.mealItem.deleteMany({
      where: { mealId },
    });
  }
}
