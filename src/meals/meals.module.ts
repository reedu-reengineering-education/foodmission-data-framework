import { Module } from '@nestjs/common';
import { MealsController } from './controllers/meals.controller';
import { MealService } from './services/meal.service';
import { MealRepository } from './repositories/meal.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { UsersRepository } from '../users/repositories/users.repository';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [MealsController],
  providers: [MealService, MealRepository, UsersRepository],
  exports: [MealService, MealRepository],
})
export class MealModule {}
