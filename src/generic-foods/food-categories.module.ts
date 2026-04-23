import { Module } from '@nestjs/common';
import { GenericFoodController } from './controllers/generic-foods.controller';
import { GenericFoodService } from './services/generic-food.service';
import { GenericFoodRepository } from './repositories/generic-food.repository';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [GenericFoodController],
  providers: [GenericFoodService, GenericFoodRepository],
  exports: [GenericFoodService, GenericFoodRepository],
})
export class GenericFoodsModule {}
