import { Module } from '@nestjs/common';
import { FoodWasteController } from './controllers/food-waste.controller';
import { FoodWasteService } from './services/food-waste.service';
import { FoodWasteRepository } from './repositories/food-waste.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { PantryItemModule } from '../pantryItem/pantry.module';
import { FoodModule } from '../food/food.module';

@Module({
  imports: [DatabaseModule, CommonModule, PantryItemModule, FoodModule],
  controllers: [FoodWasteController],
  providers: [FoodWasteService, FoodWasteRepository],
  exports: [FoodWasteService, FoodWasteRepository],
})
export class FoodWasteModule {}
