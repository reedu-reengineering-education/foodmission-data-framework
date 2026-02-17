import { Module } from '@nestjs/common';
import { RecipeController } from './controllers/recipe.controller';
import { RecipeService } from './services/recipe.service';
import { RecipeRepository } from './repositories/recipe.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { MealModule } from '../meal/meal.module';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  imports: [DatabaseModule, CommonModule, MealModule],
  controllers: [RecipeController],
  providers: [RecipeService, RecipeRepository, UserRepository],
  exports: [RecipeService, RecipeRepository],
})
export class RecipeModule {}
