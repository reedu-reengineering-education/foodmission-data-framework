import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { OpenFoodFactsHealthIndicator } from './openfoodfacts.health';
import { DatabaseModule } from '../database/database.module';
import { DatabaseHealthIndicator } from './database.health';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    DatabaseModule,
  ],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    OpenFoodFactsHealthIndicator,
  ],
})
export class HealthModule {}