import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      return this.getStatus(key, true, {
        message: 'Database connection is healthy',
      });
    } catch (error) {
      const result = this.getStatus(key, false, {
        message: 'Database connection failed',
        error: error.message,
      });

      throw new HealthCheckError('Database check failed', result);
    }
  }
}
