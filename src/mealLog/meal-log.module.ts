import { Module } from '@nestjs/common';
import { MealLogController } from './controllers/meal-log.controller';
import { MealLogService } from './services/meal-log.service';
import { MealLogRepository } from './repositories/meal-log.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { MealModule } from '../meal/meal.module';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  imports: [DatabaseModule, CommonModule, MealModule],
  controllers: [MealLogController],
  providers: [MealLogService, MealLogRepository, UserRepository],
  exports: [MealLogService, MealLogRepository],
})
export class MealLogModule {}
