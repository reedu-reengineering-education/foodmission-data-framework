import { Module } from '@nestjs/common';
import { GenericFoodsController } from './controllers/generic-foods.controller';
import { GenericFoodService } from './services/generic-food.service';
import { GenericFoodRepository } from './repositories/generic-food.repository';
import { FoodSearchRepository } from './repositories/food-search.repository';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { TranslationsModule } from '../translations/translations.module';

@Module({
  imports: [DatabaseModule, UsersModule, TranslationsModule],
  controllers: [GenericFoodsController],
  providers: [GenericFoodService, GenericFoodRepository, FoodSearchRepository],
  exports: [GenericFoodService, GenericFoodRepository],
})
export class GenericFoodsModule {}
