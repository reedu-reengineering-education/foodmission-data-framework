import { Module } from '@nestjs/common';
import { FoodCategoryController } from './controllers/food-categories.controller';
import { FoodCategoriesService } from './services/food-categories.service';
import { FoodCategoriesRepository } from './repositories/food-categories.repository';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [FoodCategoryController],
  providers: [FoodCategoriesService, FoodCategoriesRepository],
  exports: [FoodCategoriesService, FoodCategoriesRepository],
})
export class FoodCategoriesModule {}
