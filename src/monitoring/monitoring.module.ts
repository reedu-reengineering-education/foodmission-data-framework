import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MonitoringMiddleware } from './monitoring.middleware';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';

@Module({
  providers: [MetricsService, MonitoringMiddleware, PerformanceService],
  controllers: [MetricsController, PerformanceController],
  exports: [MetricsService, MonitoringMiddleware, PerformanceService],
})
export class MonitoringModule {}
