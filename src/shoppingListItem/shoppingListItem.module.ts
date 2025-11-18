import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { ShoppingListItemService } from './services/shoppingListItem.service';
import { ShoppingListItemRepository } from './repositories/shoppingListItem.repository';
import { ShoppingListModule } from '../shoppingList/shoppingList.module';
import { ShoppingListItemController } from './controllers/shoppingListItem.controller';
import { UserModule } from '../user/user.module';
import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';
import { PantryItemModule } from '../pantryItem/pantry.module';

@Module({
  imports: [
    DatabaseModule,
    HttpModule,
    ShoppingListModule,
    UserModule,
    CommonModule,
    PantryItemModule,
  ],
  controllers: [ShoppingListItemController],
  providers: [
    ShoppingListItemService,
    ShoppingListItemRepository,
    UserRepository,
  ],
  exports: [ShoppingListItemService, ShoppingListItemRepository],
})
export class ShoppingListItemModule {}
