import { Module } from '@nestjs/common';
import { FoodCategoryController } from './controllers/food-category.controller';
import { FoodCategoryService } from './services/food-category.service';
import { FoodCategoryRepository } from './repositories/food-category.repository';
import { DatabaseModule } from '../database/database.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [DatabaseModule, UserModule],
  controllers: [FoodCategoryController],
  providers: [FoodCategoryService, FoodCategoryRepository],
  exports: [FoodCategoryService, FoodCategoryRepository],
})
export class FoodCategoryModule {}
