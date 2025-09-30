import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { ShoppingListItemService } from './services/shoppingListItem.service';
import { ShoppingListItemRepository } from './repositories/shoppingListItem.repository';
import { ShoppingListModule } from '../shoppingList/shoppingList.module';
import { ShoppingListItemController } from './controllers/shoppingListItem.controller';
import { UserModule } from 'src/user/user.module';
import { CommonModule } from 'src/common/common.module';
import { UserRepository } from 'src/user/repositories/user.repository';

@Module({
  imports: [
    DatabaseModule,
    HttpModule,
    ShoppingListModule,
    UserModule,
    CommonModule,
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
