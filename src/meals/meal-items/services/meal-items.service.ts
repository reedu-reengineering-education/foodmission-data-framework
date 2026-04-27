import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { MealItemRepository } from '../repositories/meal-items.repository';
import { MealItemWithRelations } from '../../../common/types/prisma-relations';
import { MealsRepository } from '../../repositories/meals.repository';
import { FoodProductRepository } from '../../../food-products/repositories/food-product.repository';
import { GenericFoodRepository } from '../../../generic-foods/repositories/generic-food.repository';
import { CreateMealItemDto } from '../dto/create-meal-item.dto';
import { UpdateMealItemDto } from '../dto/update-meal-item.dto';
import { handlePrismaError } from '../../../common/utils/error.utils';

@Injectable()
export class MealItemService {
  constructor(
    private readonly mealItemRepository: MealItemRepository,
    private readonly mealRepository: MealsRepository,
    private readonly foodProductRepository: FoodProductRepository,
    private readonly genericFoodRepository: GenericFoodRepository,
  ) {}

  async create(
    createMealItemDto: CreateMealItemDto,
    userId: string,
  ): Promise<MealItemWithRelations> {
    try {
      const { mealId, foodProductId, genericFoodId, quantity, unit, notes } =
        createMealItemDto;

      const meal = await this.mealRepository.findById(mealId);
      if (!meal) {
        throw new NotFoundException(`Meal with ID '${mealId}' not found`);
      }
      if (meal.userId !== userId) {
        throw new NotFoundException(`Meal with ID '${mealId}' not found`);
      }

      if (foodProductId) {
        const foodProduct =
          await this.foodProductRepository.findById(foodProductId);
        if (!foodProduct) {
          throw new NotFoundException(
            `Food product with ID '${foodProductId}' not found`,
          );
        }

        const existing = await this.mealItemRepository.findByMealAndFoodProduct(
          mealId,
          foodProductId,
        );
        if (existing) {
          throw new ConflictException(
            `Meal already contains this food product. Update the existing item instead.`,
          );
        }
      } else if (genericFoodId) {
        const genericFood =
          await this.genericFoodRepository.findById(genericFoodId);
        if (!genericFood) {
          throw new NotFoundException(
            `Generic food with ID '${genericFoodId}' not found`,
          );
        }

        const existing = await this.mealItemRepository.findByMealAndGenericFood(
          mealId,
          genericFoodId,
        );
        if (existing) {
          throw new ConflictException(
            `Meal already contains this generic food. Update the existing item instead.`,
          );
        }
      }

      const itemType = foodProductId ? 'food_product' : 'generic_food';

      return await this.mealItemRepository.create({
        mealId,
        foodProductId: foodProductId || null,
        genericFoodId: genericFoodId || null,
        itemType,
        quantity,
        unit,
        notes: notes || null,
      });
    } catch (error) {
      throw handlePrismaError(error, 'create meal item', 'MealItem');
    }
  }

  async findAll(): Promise<MealItemWithRelations[]> {
    try {
      return await this.mealItemRepository.findAll();
    } catch (error) {
      throw handlePrismaError(error, 'find meal items', 'MealItem');
    }
  }

  async findByMealId(
    mealId: string,
    userId: string,
  ): Promise<MealItemWithRelations[]> {
    try {
      const meal = await this.mealRepository.findById(mealId);
      if (!meal) {
        throw new NotFoundException(`Meal with ID '${mealId}' not found`);
      }
      if (meal.userId !== userId) {
        throw new NotFoundException(`Meal with ID '${mealId}' not found`);
      }

      return await this.mealItemRepository.findByMealId(mealId);
    } catch (error) {
      throw handlePrismaError(error, 'find meal items', 'MealItem');
    }
  }

  async findById(id: string, userId: string): Promise<MealItemWithRelations> {
    try {
      const mealItem = await this.mealItemRepository.findById(id);
      if (!mealItem) {
        throw new NotFoundException(`Meal item with ID '${id}' not found`);
      }

      const meal = await this.mealRepository.findById(mealItem.mealId);
      if (!meal || meal.userId !== userId) {
        throw new NotFoundException(`Meal item with ID '${id}' not found`);
      }

      return mealItem;
    } catch (error) {
      throw handlePrismaError(error, 'find meal item', 'MealItem');
    }
  }

  async update(
    id: string,
    updateMealItemDto: UpdateMealItemDto,
    userId: string,
  ): Promise<MealItemWithRelations> {
    try {
      // Find existing item
      const existingItem = await this.findById(id, userId);

      const { foodProductId, genericFoodId, quantity, unit, notes } =
        updateMealItemDto;

      // Validate new foodProduct/genericFood if provided
      let itemType = existingItem.itemType;

      if (foodProductId !== undefined) {
        if (foodProductId === null) {
          // Removing foodProduct, must have genericFood
          if (!genericFoodId && !existingItem.genericFoodId) {
            throw new ConflictException(
              'Cannot remove food product without providing a generic food',
            );
          }
        } else {
          const foodProduct =
            await this.foodProductRepository.findById(foodProductId);
          if (!foodProduct) {
            throw new NotFoundException(
              `Food product with ID '${foodProductId}' not found`,
            );
          }

          // Check for duplicates
          const existing =
            await this.mealItemRepository.findByMealAndFoodProduct(
              existingItem.mealId,
              foodProductId,
            );
          if (existing && existing.id !== id) {
            throw new ConflictException(
              `Meal already contains this food product. Update the existing item instead.`,
            );
          }

          itemType = 'food_product';
        }
      }

      if (genericFoodId !== undefined) {
        if (genericFoodId === null) {
          // Removing genericFood, must have foodProduct
          if (!foodProductId && !existingItem.foodProductId) {
            throw new ConflictException(
              'Cannot remove generic food without providing a food product',
            );
          }
        } else {
          const genericFood =
            await this.genericFoodRepository.findById(genericFoodId);
          if (!genericFood) {
            throw new NotFoundException(
              `Generic food with ID '${genericFoodId}' not found`,
            );
          }

          // Check for duplicates
          const existing =
            await this.mealItemRepository.findByMealAndGenericFood(
              existingItem.mealId,
              genericFoodId,
            );
          if (existing && existing.id !== id) {
            throw new ConflictException(
              `Meal already contains this generic food. Update the existing item instead.`,
            );
          }

          itemType = 'generic_food';
        }
      }

      // Build update data - use Prisma's connect/disconnect pattern for relations
      const updateData: any = {
        itemType,
        quantity: quantity !== undefined ? quantity : existingItem.quantity,
        unit: unit !== undefined ? unit : existingItem.unit,
        notes: notes !== undefined ? notes : existingItem.notes,
      };

      // Handle foodProduct relation
      if (foodProductId !== undefined) {
        if (foodProductId === null) {
          updateData.foodProduct = { disconnect: true };
          updateData.foodProductId = null;
        } else {
          updateData.foodProduct = { connect: { id: foodProductId } };
        }
      }

      // Handle genericFood relation
      if (genericFoodId !== undefined) {
        if (genericFoodId === null) {
          updateData.genericFood = { disconnect: true };
          updateData.genericFoodId = null;
        } else {
          updateData.genericFood = { connect: { id: genericFoodId } };
        }
      }

      return await this.mealItemRepository.update(id, updateData);
    } catch (error) {
      throw handlePrismaError(error, 'update meal item', 'MealItem');
    }
  }
  async delete(id: string, userId: string): Promise<void> {
    try {
      // Validate exists and belongs to user
      await this.findById(id, userId);
      await this.mealItemRepository.delete(id);
    } catch (error) {
      throw handlePrismaError(error, 'delete meal item', 'MealItem');
    }
  }

  async deleteByMealId(mealId: string, userId: string): Promise<void> {
    try {
      const meal = await this.mealRepository.findById(mealId);
      if (!meal || meal.userId !== userId) {
        throw new NotFoundException(`Meal with ID '${mealId}' not found`);
      }
      await this.mealItemRepository.deleteByMealId(mealId);
    } catch (error) {
      throw handlePrismaError(error, 'delete meal items', 'MealItem');
    }
  }
}
