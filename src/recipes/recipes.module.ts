import { Module } from '@nestjs/common';
import { RecipeController } from './controllers/recipes.controller';
import { RecommendationsController } from './controllers/recommendations.controller';
import { RecipesService } from './services/recipes.service';
import { RecipeNutritionService } from './services/recipe-nutrition.service';
import { RecommendationsService } from './services/recommendations.service';
import { RecipesRepository } from './repositories/recipes.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { PantryModule } from '../pantry/pantry.module';
import { UsersRepository } from '../users/repositories/users.repository';

@Module({
  imports: [DatabaseModule, CommonModule, PantryModule],
  controllers: [RecipeController, RecommendationsController],
  providers: [
    RecipesService,
    RecipeNutritionService,
    RecommendationsService,
    RecipesRepository,
    UsersRepository,
  ],
  exports: [RecipesService, RecipeNutritionService, RecipesRepository],
})
export class RecipesModule {}
