import { Module } from '@nestjs/common';
import { FoodCategoryController } from './controllers/food-categories.controller';
import { FoodCategoryService } from './services/food-category.service';
import { FoodCategoryRepository } from './repositories/food-category.repository';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [FoodCategoryController],
  providers: [FoodCategoryService, FoodCategoryRepository],
  exports: [FoodCategoryService, FoodCategoryRepository],
})
export class FoodCategoriesModule {}
