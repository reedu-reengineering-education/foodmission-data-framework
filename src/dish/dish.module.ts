import { Module } from '@nestjs/common';
import { DishController } from './controllers/dish.controller';
import { DishService } from './services/dish.service';
import { DishRepository } from './repositories/dish.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { PantryItemRepository } from '../pantryItem/repositories/pantryItem.repository';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [DishController],
  providers: [
    DishService,
    DishRepository,
    PantryItemRepository,
    UserRepository,
  ],
  exports: [DishService, DishRepository],
})
export class DishModule {}
