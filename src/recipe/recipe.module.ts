import { Module } from '@nestjs/common';
import { RecipeController } from './controllers/recipe.controller';
import { RecipeService } from './services/recipe.service';
import { RecipeNutritionService } from './services/recipe-nutrition.service';
import { RecipeRepository } from './repositories/recipe.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [RecipeController],
  providers: [
    RecipeService,
    RecipeNutritionService,
    RecipeRepository,
    UserRepository,
  ],
  exports: [RecipeService, RecipeNutritionService, RecipeRepository],
})
export class RecipeModule {}
