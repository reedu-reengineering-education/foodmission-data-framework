import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { FoodController } from './controllers/food.controller';
import { FoodService } from './services/food.service';
import { OpenFoodFactsService } from './services/openfoodfacts.service';
import { FoodRepository } from './repositories/food.repository';
import { UserRepository } from 'src/user/repositories/user.repository';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [DatabaseModule, AuthModule, HttpModule, CommonModule],
  controllers: [FoodController],
  providers: [
    FoodService,
    OpenFoodFactsService,
    FoodRepository,
    UserRepository,
  ],
  exports: [FoodService, OpenFoodFactsService, FoodRepository],
})
export class FoodModule {}
