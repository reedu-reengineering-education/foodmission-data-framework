import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MonitoringMiddleware } from './monitoring.middleware';

@Module({
  providers: [MetricsService, MonitoringMiddleware],
  controllers: [MetricsController],
  exports: [MetricsService, MonitoringMiddleware],
})
export class MonitoringModule {}
