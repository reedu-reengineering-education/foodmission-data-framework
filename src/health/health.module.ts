import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../database/database.module';
import { DatabaseHealthIndicator } from './database.health';
import { KeycloakHealthIndicator } from './keycloak.health';
import { CacheHealthIndicator } from './cache.health';

@Module({
  imports: [TerminusModule, HttpModule, ConfigModule, DatabaseModule],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    KeycloakHealthIndicator,
    CacheHealthIndicator,
  ],
})
export class HealthModule {}
