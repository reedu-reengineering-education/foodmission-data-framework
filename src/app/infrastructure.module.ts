import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { HealthModule } from '../health/health.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    CommonModule,
    DatabaseModule,
    CacheModule,
    SecurityModule,
    AuthModule,
    HealthModule,
    MonitoringModule,
  ],
})
export class InfrastructureModule {}
