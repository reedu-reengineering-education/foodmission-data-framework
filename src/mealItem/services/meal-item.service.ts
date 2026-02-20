import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  MealItemRepository,
  MealItemWithRelations,
} from '../repositories/meal-item.repository';
import { MealRepository } from '../../meal/repositories/meal.repository';
import { FoodRepository } from '../../food/repositories/food.repository';
import { FoodCategoryRepository } from '../../foodCategory/repositories/food-category.repository';
import { CreateMealItemDto } from '../dto/create-meal-item.dto';
import { UpdateMealItemDto } from '../dto/update-meal-item.dto';
import { handlePrismaError } from '../../common/utils/error.utils';

@Injectable()
export class MealItemService {
  constructor(
    private readonly mealItemRepository: MealItemRepository,
    private readonly mealRepository: MealRepository,
    private readonly foodRepository: FoodRepository,
    private readonly foodCategoryRepository: FoodCategoryRepository,
  ) {}

  async create(
    createMealItemDto: CreateMealItemDto,
    userId: string,
  ): Promise<MealItemWithRelations> {
    try {
      const { mealId, foodId, foodCategoryId, quantity, unit, notes } =
        createMealItemDto;

      // Validate meal exists and belongs to user
      const meal = await this.mealRepository.findById(mealId);
      console.log(createMealItemDto);
      if (!meal) {
        throw new NotFoundException(`Meal with ID '${mealId}' not found`);
      }
      if (meal.userId !== userId) {
        throw new NotFoundException(`Meal with ID '${mealId}' not found`);
      }

      // Validate either food or foodCategory exists
      if (foodId) {
        const food = await this.foodRepository.findById(foodId);
        if (!food) {
          throw new NotFoundException(`Food with ID '${foodId}' not found`);
        }

        // Check for duplicates
        const existing = await this.mealItemRepository.findByMealAndFood(
          mealId,
          foodId,
        );
        if (existing) {
          throw new ConflictException(
            `Meal already contains this food item. Update the existing item instead.`,
          );
        }
      } else if (foodCategoryId) {
        const foodCategory =
          await this.foodCategoryRepository.findById(foodCategoryId);
        if (!foodCategory) {
          throw new NotFoundException(
            `Food category with ID '${foodCategoryId}' not found`,
          );
        }

        // Check for duplicates
        const existing =
          await this.mealItemRepository.findByMealAndFoodCategory(
            mealId,
            foodCategoryId,
          );
        if (existing) {
          throw new ConflictException(
            `Meal already contains this food category. Update the existing item instead.`,
          );
        }
      }

      // Determine itemType based on which ID is provided
      const itemType = foodId ? 'food' : 'food_category';

      // Create meal item
      return await this.mealItemRepository.create({
        mealId,
        foodId: foodId || null,
        foodCategoryId: foodCategoryId || null,
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
      // Validate meal exists and belongs to user
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

      // Validate meal belongs to user
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

      const { foodId, foodCategoryId, quantity, unit, notes } =
        updateMealItemDto;

      // Validate new food/foodCategory if provided
      let itemType = existingItem.itemType;

      if (foodId !== undefined) {
        if (foodId === null) {
          // Removing food, must have foodCategory
          if (!foodCategoryId && !existingItem.foodCategoryId) {
            throw new ConflictException(
              'Cannot remove food without providing a food category',
            );
          }
        } else {
          const food = await this.foodRepository.findById(foodId);
          if (!food) {
            throw new NotFoundException(`Food with ID '${foodId}' not found`);
          }

          // Check for duplicates
          const existing = await this.mealItemRepository.findByMealAndFood(
            existingItem.mealId,
            foodId,
          );
          if (existing && existing.id !== id) {
            throw new ConflictException(
              `Meal already contains this food item. Update the existing item instead.`,
            );
          }

          itemType = 'food';
        }
      }

      if (foodCategoryId !== undefined) {
        if (foodCategoryId === null) {
          // Removing foodCategory, must have food
          if (!foodId && !existingItem.foodId) {
            throw new ConflictException(
              'Cannot remove food category without providing a food',
            );
          }
        } else {
          const foodCategory =
            await this.foodCategoryRepository.findById(foodCategoryId);
          if (!foodCategory) {
            throw new NotFoundException(
              `Food category with ID '${foodCategoryId}' not found`,
            );
          }

          // Check for duplicates
          const existing =
            await this.mealItemRepository.findByMealAndFoodCategory(
              existingItem.mealId,
              foodCategoryId,
            );
          if (existing && existing.id !== id) {
            throw new ConflictException(
              `Meal already contains this food category. Update the existing item instead.`,
            );
          }

          itemType = 'food_category';
        }
      }

      // Build update data - use Prisma's connect/disconnect pattern for relations
      const updateData: any = {
        itemType,
        quantity: quantity !== undefined ? quantity : existingItem.quantity,
        unit: unit !== undefined ? unit : existingItem.unit,
        notes: notes !== undefined ? notes : existingItem.notes,
      };

      // Handle food relation
      if (foodId !== undefined) {
        if (foodId === null) {
          updateData.food = { disconnect: true };
          updateData.foodId = null;
        } else {
          updateData.food = { connect: { id: foodId } };
        }
      }

      // Handle foodCategory relation
      if (foodCategoryId !== undefined) {
        if (foodCategoryId === null) {
          updateData.foodCategory = { disconnect: true };
          updateData.foodCategoryId = null;
        } else {
          updateData.foodCategory = { connect: { id: foodCategoryId } };
        }
      }

      // Update meal item
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
      // Validate meal exists and belongs to user
      const meal = await this.mealRepository.findById(mealId);
      if (!meal) {
        throw new NotFoundException(`Meal with ID '${mealId}' not found`);
      }
      if (meal.userId !== userId) {
        throw new NotFoundException(`Meal with ID '${mealId}' not found`);
      }

      await this.mealItemRepository.deleteByMealId(mealId);
    } catch (error) {
      throw handlePrismaError(error, 'delete meal items', 'MealItem');
    }
  }
}
