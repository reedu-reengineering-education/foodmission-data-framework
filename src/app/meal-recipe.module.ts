import { Module } from '@nestjs/common';
import { MealModule } from '../meals/meals.module';
import { MealItemsModule } from '../mealItems/meal-items.module';
import { MealLogModule } from '../mealLogs/meal-log.module';
import { RecipeModule } from '../recipes/recipes.module';

@Module({
  imports: [MealModule, MealItemsModule, RecipeModule, MealLogModule],
})
export class MealRecipeModule {}
