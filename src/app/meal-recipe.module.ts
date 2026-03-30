import { Module } from '@nestjs/common';
import { MealsModule } from '../meals/meals.module';
import { MealItemsModule } from '../meals/meal-items/meal-items.module';
import { MealLogsModule } from '../meal-logs/meal-logs.module';
import { RecipesModule } from '../recipes/recipes.module';
import { RecipeRecommendationsModule } from '../recipe-recommendations/recipe-recommendations.module';

@Module({
  imports: [
    MealsModule,
    MealItemsModule,
    RecipesModule,
    MealLogsModule,
    RecipeRecommendationsModule,
  ],
})
export class MealRecipeModule {}
