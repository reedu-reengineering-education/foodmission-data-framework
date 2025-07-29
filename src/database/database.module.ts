import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { OptimizedDatabaseService } from './optimized-database.service';
import { CacheModule } from '../cache/cache.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { LoggingModule } from '../common/logging/logging.module';

@Global()
@Module({
  imports: [CacheModule, MonitoringModule, LoggingModule],
  providers: [PrismaService, OptimizedDatabaseService],
  exports: [PrismaService, OptimizedDatabaseService],
})
export class DatabaseModule {}