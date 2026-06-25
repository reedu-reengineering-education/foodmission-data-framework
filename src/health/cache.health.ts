import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import KeyvRedis from '@keyv/redis';

@Injectable()
export class CacheHealthIndicator {
  private readonly cacheClient: KeyvRedis<string> | null = null;

  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly configService: ConfigService,
  ) {
    const cacheUrl = this.configService.get<string>('CACHE_URL');
    if (cacheUrl) {
      this.cacheClient = new KeyvRedis(cacheUrl);
    }
  }

  get isConfigured(): boolean {
    return this.cacheClient !== null;
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const check = this.healthIndicatorService.check(key);
    if (!this.cacheClient) {
      return check.up({ message: 'Cache not configured' });
    }

    try {
      await this.cacheClient.set('_healthcheck', '1', 5000);
      await this.cacheClient.delete('_healthcheck');
      return check.up();
    } catch (error) {
      return check.down({ message: (error as Error).message });
    }
  }
}
