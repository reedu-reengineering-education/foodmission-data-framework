import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { FoodsModule } from '../foods/foods.module';
import { FoodCategoriesModule } from '../foodCategories/food-categories.module';
import { PantriesModule } from '../pantries/pantries.module';
import { ShoppingListsController } from './controllers/shopping-lists.controller';
import { ShoppingListItemsController } from './controllers/shopping-list-items.controller';
import { ShoppingListService } from './services/shopping-lists.service';
import { ShoppingListItemService } from './services/shopping-list-items.service';
import { ShoppingListRepository } from './repositories/shopping-lists.repository';
import { ShoppingListItemRepository } from './repositories/shopping-list-items.repository';

@Module({
  imports: [
    DatabaseModule,
    HttpModule,
    CommonModule,
    PantriesModule,
    FoodsModule,
    FoodCategoriesModule,
  ],
  controllers: [ShoppingListsController, ShoppingListItemsController],
  providers: [
    ShoppingListService,
    ShoppingListItemService,
    ShoppingListRepository,
    ShoppingListItemRepository,
    UsersRepository,
  ],
  exports: [
    ShoppingListService,
    ShoppingListRepository,
    ShoppingListItemService,
    ShoppingListItemRepository,
  ],
})
export class ShoppingListsModule {}
