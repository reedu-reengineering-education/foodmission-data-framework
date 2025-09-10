import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { ShoppingListService } from './services/shoppingList.service';
import { ShoppingListRepository } from './repositories/shoppingList.repository';
import { ShoppingListController } from './controllers/shoppingList.controller';

@Module({
  imports: [DatabaseModule, HttpModule],
  controllers: [ShoppingListController],
  providers: [ShoppingListService, ShoppingListRepository],
  exports: [ShoppingListService, ShoppingListRepository],
})
export class ShoppingListModule {}
