import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health';
import { OpenFoodFactsHealthIndicator } from './openfoodfacts.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: DatabaseHealthIndicator,
    private openFoodFacts: OpenFoodFactsHealthIndicator,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get application health status' })
  @ApiResponse({
    status: 200,
    description: 'Health check passed',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            openfoodfacts: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
        error: { type: 'object' },
        details: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            openfoodfacts: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Health check failed',
  })
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.openFoodFacts.isHealthy('openfoodfacts'),
    ]);
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Get readiness probe status' })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
  })
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.isHealthy('database')]);
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Get liveness probe status' })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  @HealthCheck()
  liveness(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }
}
