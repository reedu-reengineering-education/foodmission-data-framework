import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsAggregator } from './services/analytics-aggregator.service';
import { AnalyticsRepository } from './repositories/analytics.repository';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsAggregator, AnalyticsRepository, UserRepository],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
