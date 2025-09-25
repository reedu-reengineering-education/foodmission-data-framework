import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { ShoppingListItemService } from './services/shoppingListItem.service';
import { ShoppingListItemRepository } from './repositories/shoppingListItem.repository';
import { ShoppingListModule } from '../shoppingList/shoppingList.module';
import { ShoppingListItemController } from './controllers/shoppingListItem.controller';

@Module({
  imports: [DatabaseModule, HttpModule, ShoppingListModule],
  controllers: [ShoppingListItemController],
  providers: [ShoppingListItemService, ShoppingListItemRepository],
  exports: [ShoppingListItemService, ShoppingListItemRepository],
})
export class ShoppingListItemModule {}
