import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MealLogAnalyticsController } from './meal-log/controllers/meal-log-analytics.controller';
import { MealLogAnalyticsService } from './meal-log/services/meal-log-analytics.service';
import { MealLogAnalyticsAggregator } from './meal-log/services/meal-log-analytics-aggregator.service';
import { MealLogAnalyticsRepository } from './meal-log/repositories/meal-log-analytics.repository';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [MealLogAnalyticsController],
  providers: [MealLogAnalyticsService, MealLogAnalyticsAggregator, MealLogAnalyticsRepository, UserRepository],
  exports: [MealLogAnalyticsService],
})
export class AnalyticsModule {}
