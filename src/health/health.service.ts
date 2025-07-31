import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class HealthService {
  private startTime = Date.now();
  private requestCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;

  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    const timestamp = new Date().toISOString();
    const uptime = (Date.now() - this.startTime) / 1000;

    const checks = {
      database: await this.checkDatabase(),
      keycloak: await this.checkKeycloak(),
      openFoodFacts: await this.checkOpenFoodFacts(),
    };

    // In test environment, only require database to be healthy
    const isTestEnv = process.env.NODE_ENV === 'test';
    const requiredChecks = isTestEnv
      ? ['database']
      : ['database', 'keycloak', 'openFoodFacts'];

    const allHealthy = requiredChecks.every(
      (checkName) => checks[checkName]?.status === 'ok',
    );

    const result = {
      status: allHealthy ? 'ok' : 'error',
      timestamp,
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
    };

    if (!allHealthy) {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }

  async getReadiness() {
    const timestamp = new Date().toISOString();

    // Check if database is ready
    const dbCheck = await this.checkDatabase();

    if (dbCheck.status !== 'ok') {
      throw new ServiceUnavailableException({
        status: 'not ready',
        timestamp,
        reason: 'Database not ready',
      });
    }

    return {
      status: 'ready',
      timestamp,
    };
  }

  getLiveness() {
    const timestamp = new Date().toISOString();
    const uptime = (Date.now() - this.startTime) / 1000;

    return {
      status: 'alive',
      timestamp,
      uptime,
    };
  }

  getMetrics() {
    const uptime = (Date.now() - this.startTime) / 1000;
    const memoryUsage = process.memoryUsage();

    return {
      uptime,
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: Math.round(
          (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        ),
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to seconds
      },
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        averageResponseTime:
          this.requestCount > 0
            ? this.totalResponseTime / this.requestCount
            : 0,
      },
      database: {
        connections: 1, // Prisma manages connection pooling internally
        queries: 0, // Would need to implement query counting
      },
    };
  }

  // Method to track requests (would be called by middleware)
  trackRequest(responseTime: number, isError: boolean = false) {
    this.requestCount++;
    this.totalResponseTime += responseTime;
    if (isError) {
      this.errorCount++;
    }
  }

  private async checkDatabase(): Promise<{
    status: string;
    responseTime: number;
  }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        responseTime: Date.now() - start,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return {
        status: 'error',
        responseTime: Date.now() - start,
      };
    }
  }

  private async checkKeycloak(): Promise<{
    status: string;
    responseTime: number;
  }> {
    const start = Date.now();
    try {
      const keycloakUrl =
        process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080';
      const realm = process.env.KEYCLOAK_REALM || 'foodmission';

      const response = await fetch(
        `${keycloakUrl}/realms/${realm}/.well-known/openid_configuration`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        },
      );

      if (response.ok) {
        return {
          status: 'ok',
          responseTime: Date.now() - start,
        };
      } else {
        return {
          status: 'error',
          responseTime: Date.now() - start,
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return {
        status: 'error',
        responseTime: Date.now() - start,
      };
    }
  }

  private async checkOpenFoodFacts(): Promise<{
    status: string;
    responseTime: number;
  }> {
    const start = Date.now();
    try {
      const response = await fetch(
        'https://world.openfoodfacts.org/api/v0/product/3017620422003.json',
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        },
      );

      if (response.ok) {
        return {
          status: 'ok',
          responseTime: Date.now() - start,
        };
      } else {
        return {
          status: 'error',
          responseTime: Date.now() - start,
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return {
        status: 'error',
        responseTime: Date.now() - start,
      };
    }
  }
}
