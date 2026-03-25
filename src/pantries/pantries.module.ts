import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { FoodCategoriesModule } from '../food-category/food-categories.module';
import { PantriesController } from './controllers/pantries.controller';
import { PantryItemsController } from './controllers/pantry-items.controller';
import { PantryService } from './services/pantries.service';
import { PantryItemService } from './services/pantry-items.service';
import { PantryRepository } from './repositories/pantries.repository';
import { PantryItemRepository } from './repositories/pantry-items.repository';

@Module({
  imports: [DatabaseModule, HttpModule, CommonModule, FoodCategoriesModule],
  controllers: [PantriesController, PantryItemsController],
  providers: [
    PantryService,
    PantryItemService,
    PantryRepository,
    PantryItemRepository,
    UsersRepository,
  ],
  exports: [
    PantryService,
    PantryRepository,
    PantryItemService,
    PantryItemRepository,
  ],
})
export class PantriesModule {}
