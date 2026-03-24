import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';
import { FoodCategoryModule } from '../foodCategory/food-category.module';
import { PantriesController } from './controllers/pantries.controller';
import { PantryItemsController } from './controllers/pantry-items.controller';
import { PantryService } from './services/pantries.service';
import { PantryItemService } from './services/pantry-items.service';
import { PantryRepository } from './repositories/pantries.repository';
import { PantryItemRepository } from './repositories/pantry-items.repository';

@Module({
  imports: [DatabaseModule, HttpModule, CommonModule, FoodCategoryModule],
  controllers: [PantriesController, PantryItemsController],
  providers: [
    PantryService,
    PantryItemService,
    PantryRepository,
    PantryItemRepository,
    UserRepository,
  ],
  exports: [
    PantryService,
    PantryRepository,
    PantryItemService,
    PantryItemRepository,
  ],
})
export class PantriesModule {}
