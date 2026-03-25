import { Module } from '@nestjs/common';
import { MealLogsController } from './controllers/meal-logs.controller';
import { MealLogsService } from './services/meal-logs.service';
import { MealLogsRepository } from './repositories/meal-logs.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { MealModule } from '../meals/meals.module';
import { UsersRepository } from '../users/repositories/users.repository';

@Module({
  imports: [DatabaseModule, CommonModule, MealModule],
  controllers: [MealLogsController],
  providers: [MealLogsService, MealLogsRepository, UsersRepository],
  exports: [MealLogsService, MealLogsRepository],
})
export class MealLogsModule {}
