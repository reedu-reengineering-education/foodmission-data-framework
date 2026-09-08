import { Module } from '@nestjs/common';
import { GenericFoodsController } from './controllers/generic-foods.controller';
import { GenericFoodService } from './services/generic-food.service';
import { GenericFoodRepository } from './repositories/generic-food.repository';
import { Foodex2FoodService } from './services/foodex2-food.service';
import { Foodex2Repository } from './repositories/foodex2.repository';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { TranslationsModule } from '../translations/translations.module';

@Module({
  imports: [DatabaseModule, UsersModule, TranslationsModule],
  controllers: [GenericFoodsController],
  providers: [
    GenericFoodService,
    GenericFoodRepository,
    Foodex2FoodService,
    Foodex2Repository,
  ],
  exports: [
    GenericFoodService,
    GenericFoodRepository,
    Foodex2FoodService,
    Foodex2Repository,
  ],
})
export class GenericFoodsModule {}
