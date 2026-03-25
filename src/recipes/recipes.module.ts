import { Module } from '@nestjs/common';
import { RecipeController } from './controllers/recipes.controller';
import { RecipesService } from './services/recipes.service';
import { RecipeNutritionService } from './services/recipe-nutrition.service';
import { RecipesRepository } from './repositories/recipes.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { UsersRepository } from '../users/repositories/users.repository';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [RecipeController],
  providers: [
    RecipesService,
    RecipeNutritionService,
    RecipesRepository,
    UsersRepository,
  ],
  exports: [RecipesService, RecipeNutritionService, RecipesRepository],
})
export class RecipeModule {}
