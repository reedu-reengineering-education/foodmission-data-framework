import { Module } from '@nestjs/common';
import { MealItemController } from './controllers/meal-items.controller';
import { MealItemService } from './services/meal-items.service';
import { MealItemRepository } from './repositories/meal-items.repository';
import { DatabaseModule } from '../../database/database.module';
import { MealsModule } from '../meals.module';
import { FoodsModule } from '../../food-products/foods.module';

import { AuthModule } from '../../auth/auth.module';
import { CommonModule } from '../../common/common.module';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [
    DatabaseModule,
    MealsModule,
    FoodsModule,
    FoodCategoriesModule,
    AuthModule,
    CommonModule,
    UsersModule,
  ],
  controllers: [MealItemController],
  providers: [MealItemService, MealItemRepository],
  exports: [MealItemService, MealItemRepository],
})
export class MealItemsModule {}
