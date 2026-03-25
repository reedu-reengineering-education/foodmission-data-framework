import { Module } from '@nestjs/common';
import { MealItemController } from './controllers/meal-item.controller';
import { MealItemService } from './services/meal-item.service';
import { MealItemRepository } from './repositories/meal-item.repository';
import { DatabaseModule } from '../database/database.module';
import { MealModule } from '../meal/meal.module';
import { FoodModule } from '../food/food.module';
import { FoodCategoryModule } from '../foodCategory/food-category.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { UsersModule } from '../user/users.module';

@Module({
  imports: [
    DatabaseModule,
    MealModule,
    FoodModule,
    FoodCategoryModule,
    AuthModule,
    CommonModule,
    UsersModule,
  ],
  controllers: [MealItemController],
  providers: [MealItemService, MealItemRepository],
  exports: [MealItemService, MealItemRepository],
})
export class MealItemModule {}
