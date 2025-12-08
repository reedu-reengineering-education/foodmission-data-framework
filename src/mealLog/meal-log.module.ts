import { Module } from '@nestjs/common';
import { MealLogController } from './controllers/meal-log.controller';
import { MealLogService } from './services/meal-log.service';
import { MealLogRepository } from './repositories/meal-log.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { DishModule } from '../dish/dish.module';

@Module({
  imports: [DatabaseModule, CommonModule, DishModule],
  controllers: [MealLogController],
  providers: [MealLogService, MealLogRepository],
  exports: [MealLogService, MealLogRepository],
})
export class MealLogModule {}
