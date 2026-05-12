import { Module } from '@nestjs/common';
import { FoodWasteController } from './controllers/food-waste.controller';
import { FoodWasteService } from './services/food-waste.service';
import { FoodWasteRepository } from './repositories/food-waste.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { FoodsModule } from '../foods/foods.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { PantryItemRepository } from '../pantry/repositories/pantry-items.repository';

@Module({
  imports: [DatabaseModule, CommonModule, FoodsModule],
  controllers: [FoodWasteController],
  providers: [
    FoodWasteService,
    FoodWasteRepository,
    PantryItemRepository,
    UsersRepository,
  ],
  exports: [FoodWasteService, FoodWasteRepository],
})
export class FoodWasteModule {}
