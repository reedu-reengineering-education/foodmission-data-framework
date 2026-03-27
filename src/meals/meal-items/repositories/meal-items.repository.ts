import { Injectable } from '@nestjs/common';
import { Prisma, MealItem } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateMealItemDto } from '../dto/create-meal-item.dto';
import { UpdateMealItemDto } from '../dto/update-meal-item.dto';
import { BaseRepository } from '../../../common/interfaces/base-repository.interface';

export type MealItemWithRelations = Prisma.MealItemGetPayload<{
  include: {
    meal: true;
    food: true;
    foodCategory: true;
  };
}>;

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
      include: {
        meal: true,
        food: true,
        foodCategory: true,
      },
    });
  }

  findAll(): Promise<MealItemWithRelations[]> {
    return this.prisma.mealItem.findMany({
      include: {
        meal: true,
        food: true,
        foodCategory: true,
      },
    });
  }

  count(): Promise<number> {
    return this.prisma.mealItem.count();
  }

  findByMealId(mealId: string): Promise<MealItemWithRelations[]> {
    return this.prisma.mealItem.findMany({
      where: { mealId },
      include: {
        meal: true,
        food: true,
        foodCategory: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(id: string): Promise<MealItemWithRelations | null> {
    return this.prisma.mealItem.findUnique({
      where: { id },
      include: {
        meal: true,
        food: true,
        foodCategory: true,
      },
    });
  }

  findByMealAndFood(
    mealId: string,
    foodId: string,
  ): Promise<MealItemWithRelations | null> {
    return this.prisma.mealItem.findFirst({
      where: {
        mealId,
        foodId,
      },
      include: {
        meal: true,
        food: true,
        foodCategory: true,
      },
    });
  }

  findByMealAndFoodCategory(
    mealId: string,
    foodCategoryId: string,
  ): Promise<MealItemWithRelations | null> {
    return this.prisma.mealItem.findFirst({
      where: {
        mealId,
        foodCategoryId,
      },
      include: {
        meal: true,
        food: true,
        foodCategory: true,
      },
    });
  }

  async checkForDuplicateItem(
    mealId: string,
    foodId?: string,
    foodCategoryId?: string,
  ): Promise<MealItemWithRelations | null> {
    if (foodId) {
      return this.findByMealAndFood(mealId, foodId);
    } else if (foodCategoryId) {
      return this.findByMealAndFoodCategory(mealId, foodCategoryId);
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
      include: {
        meal: true,
        food: true,
        foodCategory: true,
      },
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
