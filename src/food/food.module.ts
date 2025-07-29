import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { FoodController } from './controllers/food.controller';
import { FoodService } from './services/food.service';
import { OpenFoodFactsService } from './services/openfoodfacts.service';
import { FoodRepository } from './repositories/food.repository';
import { FoodCategoryRepository } from './repositories/food-category.repository';

@Module({
  imports: [
    DatabaseModule,
    HttpModule,
  ],
  controllers: [FoodController],
  providers: [
    FoodService,
    OpenFoodFactsService,
    FoodRepository,
    FoodCategoryRepository,
  ],
  exports: [
    FoodService,
    OpenFoodFactsService,
    FoodRepository,
    FoodCategoryRepository,
  ],
})
export class FoodModule {}