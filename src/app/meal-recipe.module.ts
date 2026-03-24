import { Module } from '@nestjs/common';
import { MealModule } from '../meal/meal.module';
import { MealItemModule } from '../mealItem/meal-item.module';
import { MealLogModule } from '../mealLog/meal-log.module';
import { RecipeModule } from '../recipe/recipe.module';

/**
 * Meals, meal items, recipes, and meal logs.
 */
@Module({
  imports: [MealModule, MealItemModule, RecipeModule, MealLogModule],
})
export class MealRecipeModule {}
