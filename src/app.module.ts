import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { FoodModule } from './food/food.module';

import { HealthModule } from './health/health.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { CacheModule } from './cache/cache.module';
import { SecurityModule } from './security/security.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { MonitoringMiddleware } from './monitoring/monitoring.middleware';
import { CacheMiddleware } from './cache/cache.middleware';
import { SecurityMiddleware } from './security/middleware/security.middleware';

@Module({
  imports: [
    CommonModule,
    DatabaseModule,
    CacheModule,
    SecurityModule,
    AuthModule, 
    FoodModule, 
    HealthModule,
    MonitoringModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware, LoggingMiddleware, MonitoringMiddleware)
      .forRoutes('*');
  }
}
