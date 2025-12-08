import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { ShoppingListService } from './services/shoppingList.service';
import { ShoppingListRepository } from './repositories/shoppingList.repository';
import { ShoppingListController } from './controllers/shoppingList.controller';
import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';
import { ShoppingListItemRepository } from '../shoppingListItem/repositories/shoppingListItem.repository';
@Module({
  imports: [DatabaseModule, HttpModule, CommonModule],
  controllers: [ShoppingListController],
  providers: [
    ShoppingListService,
    ShoppingListRepository,
    ShoppingListItemRepository,
    UserRepository,
  ],
  exports: [ShoppingListService, ShoppingListRepository],
})
export class ShoppingListModule {}
