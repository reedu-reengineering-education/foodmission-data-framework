import { Module } from '@nestjs/common';
import { RecipeRecommendationsController } from './controllers/recipe-recommendations.controller';
import { RecipeRecommendationsService } from './services/recipe-recommendations.service';
import { DatabaseModule } from '../database/database.module';
import { PantryModule } from '../pantry/pantry.module';

@Module({
  imports: [DatabaseModule, PantryModule],
  controllers: [RecipeRecommendationsController],
  providers: [RecipeRecommendationsService],
  exports: [RecipeRecommendationsService],
})
export class RecipeRecommendationsModule {}
