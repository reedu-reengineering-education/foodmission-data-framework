import { Module } from '@nestjs/common';
import { RecipeRecommendationsController } from './controllers/recipe-recommendations.controller';
import { RecipeRecommendationsService } from './services/recipe-recommendations.service';
import { DatabaseModule } from '../database/database.module';
import { PantryModule } from '../pantry/pantry.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DatabaseModule, PantryModule, UsersModule],
  controllers: [RecipeRecommendationsController],
  providers: [RecipeRecommendationsService],
  exports: [RecipeRecommendationsService],
})
export class RecipeRecommendationsModule {}
