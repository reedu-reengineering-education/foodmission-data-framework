import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { FoodController } from './controllers/food.controller';
import { FoodService } from './services/food.service';
import { OpenFoodFactsService } from './services/openfoodfacts.service';
import { FoodRepository } from './repositories/food.repository';
import { UsersRepository } from '../user/repositories/users.repository';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [DatabaseModule, AuthModule, HttpModule, CommonModule],
  controllers: [FoodController],
  providers: [
    FoodService,
    OpenFoodFactsService,
    FoodRepository,
    UsersRepository,
  ],
  exports: [FoodService, OpenFoodFactsService, FoodRepository],
})
export class FoodModule {}
