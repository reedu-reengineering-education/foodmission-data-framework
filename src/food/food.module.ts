import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { FoodController } from './controllers/food.controller';
import { FoodService } from './services/food.service';
import { OpenFoodFactsService } from './services/openfoodfacts.service';
import { FoodRepository } from './repositories/food.repository';

@Module({
  imports: [DatabaseModule, AuthModule, HttpModule],
  controllers: [FoodController],
  providers: [FoodService, OpenFoodFactsService, FoodRepository],
  exports: [FoodService, OpenFoodFactsService, FoodRepository],
})
export class FoodModule {}
