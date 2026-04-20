import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import KeyvRedis from '@keyv/redis';

@Injectable()
export class RedisHealthIndicator {
  private readonly redisClient: KeyvRedis<string> | null = null;

  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redisClient = new KeyvRedis(redisUrl);
    }
  }

  get isConfigured(): boolean {
    return this.redisClient !== null;
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const check = this.healthIndicatorService.check(key);
    if (!this.redisClient) {
      return check.up({ message: 'Redis not configured' });
    }

    try {
      await this.redisClient.set('_healthcheck', '1', 5000);
      await this.redisClient.delete('_healthcheck');
      return check.up();
    } catch (error) {
      return check.down({ message: (error as Error).message });
    }
  }
}
