import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { FoodCategoriesModule } from '../food-category/food-categories.module';
import { FoodsModule } from '../foods/foods.module';
import { ShelfLifeModule } from '../shelf-life/shelf-life.module';
import { FoodWasteModule } from '../foodWaste/food-waste.module';
import { PantryController } from './controllers/pantry.controller';
import { PantryItemsController } from './controllers/pantry-items.controller';
import { PantryService } from './services/pantry.service';
import { PantryItemService } from './services/pantry-items.service';
import { PantryRepository } from './repositories/pantry.repository';
import { PantryItemRepository } from './repositories/pantry-items.repository';

@Module({
  imports: [
    DatabaseModule,
    HttpModule,
    CommonModule,
    FoodCategoriesModule,
    FoodsModule,
    ShelfLifeModule,
    forwardRef(() => FoodWasteModule),
  ],
  controllers: [PantryController, PantryItemsController],
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
export class PantryModule {}
