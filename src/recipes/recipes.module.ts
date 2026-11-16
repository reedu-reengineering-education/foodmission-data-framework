import { Module } from '@nestjs/common';
import { RecipeController } from './controllers/recipes.controller';
import { RecommendationsController } from './controllers/recommendations.controller';
import { RecipesService } from './services/recipes.service';
import { RecommendationsService } from './services/recommendations.service';
import { RecipesRepository } from './repositories/recipes.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { PantryModule } from '../pantry/pantry.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [DatabaseModule, CommonModule, PantryModule, EventsModule],
  controllers: [RecipeController, RecommendationsController],
  providers: [
    RecipesService,
    RecommendationsService,
    RecipesRepository,
    UsersRepository,
  ],
  exports: [RecipesService, RecipesRepository],
})
export class RecipesModule {}
