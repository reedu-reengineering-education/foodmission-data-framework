import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { ShoppingListService } from './services/shoppingList.service';
import { ShoppingListRepository } from './repositories/shoppingList.repository';
import { ShoppingListController } from './controllers/shoppingList.controller';
import { CommonModule } from 'src/common/common.module';
import { UserRepository } from 'src/user/repositories/user.repository';
@Module({
  imports: [DatabaseModule, HttpModule, CommonModule],
  controllers: [ShoppingListController],
  providers: [ShoppingListService, ShoppingListRepository, UserRepository],
  exports: [ShoppingListService, ShoppingListRepository],
})
export class ShoppingListModule {}
