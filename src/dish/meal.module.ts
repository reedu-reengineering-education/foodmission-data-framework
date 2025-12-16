import { Module } from '@nestjs/common';
import { MealController } from './controllers/meal.controller';
import { MealService } from './services/meal.service';
import { MealRepository } from './repositories/meal.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { PantryItemRepository } from '../pantryItem/repositories/pantryItem.repository';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [MealController],
  providers: [
    MealService,
    MealRepository,
    PantryItemRepository,
    UserRepository,
  ],
  exports: [MealService, MealRepository],
})
export class MealModule {}
