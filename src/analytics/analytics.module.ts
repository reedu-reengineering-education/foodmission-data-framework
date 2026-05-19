import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MealLogAnalyticsController } from './meal-log/controllers/meal-log-analytics.controller';
import { MealLogAnalyticsService } from './meal-log/services/meal-log-analytics.service';
import { MealLogAnalyticsAggregator } from './meal-log/services/meal-log-analytics-aggregator.service';
import { MealLogAnalyticsRepository } from './meal-log/repositories/meal-log-analytics.repository';
import { ShoppingListAnalyticsController } from './shopping-list/controllers/shopping-list-analytics.controller';
import { ShoppingListAnalyticsService } from './shopping-list/services/shopping-list-analytics.service';
import { ShoppingListAnalyticsAggregator } from './shopping-list/services/shopping-list-analytics-aggregator.service';
import { ShoppingListAnalyticsRepository } from './shopping-list/repositories/shopping-list-analytics.repository';
import { UsersRepository } from '../users/repositories/users.repository';
import { AnalyticsBatchCoordinator } from './analytics-batch-coordinator.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [MealLogAnalyticsController, ShoppingListAnalyticsController],
  providers: [
    MealLogAnalyticsService,
    MealLogAnalyticsAggregator,
    MealLogAnalyticsRepository,
    ShoppingListAnalyticsService,
    ShoppingListAnalyticsAggregator,
    ShoppingListAnalyticsRepository,
    UsersRepository,
    AnalyticsBatchCoordinator,
  ],
  exports: [MealLogAnalyticsService, ShoppingListAnalyticsService],
})
export class AnalyticsModule {}
