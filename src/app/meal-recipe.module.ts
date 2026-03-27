import { Module } from '@nestjs/common';
import { MealModule } from '../meals/meals.module';
import { MealItemsModule } from '../meals/meal-items/meal-items.module';
import { MealLogsModule } from '../meal-logs/meal-logs.module';
import { RecipeModule } from '../recipes/recipes.module';

@Module({
  imports: [MealModule, MealItemsModule, RecipeModule, MealLogsModule],
})
export class MealRecipeModule {}
