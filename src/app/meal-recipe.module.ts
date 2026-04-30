import { Module } from '@nestjs/common';
import { MealsModule } from '../meals/meals.module';
import { MealItemsModule } from '../meals/meal-items/meal-items.module';
import { MealLogsModule } from '../meal-logs/meal-logs.module';
import { RecipesModule } from '../recipes/recipes.module';

@Module({
  imports: [MealsModule, MealItemsModule, RecipesModule, MealLogsModule],
})
export class MealRecipeModule {}
