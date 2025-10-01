import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';

import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';
import { PantryItemController } from './controllers/pantryItem.controller';
import { PantryItemRepository } from './repositories/pantryItem.repository';
import { PantryItemService } from './services/pantryItem.service';
@Module({
  imports: [DatabaseModule, HttpModule, CommonModule],
  controllers: [PantryItemController],
  providers: [PantryItemService, PantryItemRepository, UserRepository],
  exports: [PantryItemService, PantryItemRepository],
})
export class PantryItemModule {}
