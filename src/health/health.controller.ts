import { Controller, Get, UseFilters } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health';
import { KeycloakHealthIndicator } from './keycloak.health';
import { RedisHealthIndicator } from './redis.health';
import { HealthExceptionFilter } from './health-exception.filter';

@ApiTags('Health')
@Controller('health')
@UseFilters(HealthExceptionFilter)
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: DatabaseHealthIndicator,
    private keycloak: KeycloakHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Get readiness probe status' })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to serve traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
  })
  @HealthCheck()
  async readiness(): Promise<Omit<HealthCheckResult, 'details'>> {
    const checks: (() => Promise<any>)[] = [
      () => this.db.isHealthy('database'),
      () => this.keycloak.isHealthy('keycloak'),
    ];
    if (this.redis.isConfigured) {
      checks.push(() => this.redis.isHealthy('redis'));
    }
    const result = await this.health.check(checks);
    delete (result as any).details;
    return result;
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Get liveness probe status' })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  @HealthCheck()
  async liveness(): Promise<Omit<HealthCheckResult, 'details'>> {
    const result = await this.health.check([]);
    delete (result as any).details;
    return result;
  }
}
