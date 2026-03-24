import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';
import { FoodModule } from '../food/food.module';
import { FoodCategoryModule } from '../foodCategory/food-category.module';
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
    FoodModule,
    FoodCategoryModule,
  ],
  controllers: [ShoppingListsController, ShoppingListItemsController],
  providers: [
    ShoppingListService,
    ShoppingListItemService,
    ShoppingListRepository,
    ShoppingListItemRepository,
    UserRepository,
  ],
  exports: [
    ShoppingListService,
    ShoppingListRepository,
    ShoppingListItemService,
    ShoppingListItemRepository,
  ],
})
export class ShoppingListsModule {}
