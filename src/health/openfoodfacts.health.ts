import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class OpenFoodFactsHealthIndicator extends HealthIndicator {
  private readonly baseUrl: string;
  private readonly timeoutMs: number = 5000;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    super();
    this.baseUrl = this.configService.get<string>(
      'OPENFOODFACTS_API_URL',
      'https://world.openfoodfacts.org',
    );
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if OpenFoodFacts API is accessible
      const response = await firstValueFrom(
        this.httpService
          .get(`${this.baseUrl}/api/v0/product/737628064502.json`)
          .pipe(timeout(this.timeoutMs)),
      );

      const isHealthy = response.status === 200 && response.data;

      if (isHealthy) {
        return this.getStatus(key, true, {
          message: 'OpenFoodFacts API is accessible',
          responseTime: Date.now(),
        });
      } else {
        throw new Error('Invalid response from OpenFoodFacts API');
      }
    } catch (error) {
      const result = this.getStatus(key, false, {
        message: 'OpenFoodFacts API is not accessible',
        error: error.message,
        timeout: this.timeoutMs,
      });

      throw new HealthCheckError('OpenFoodFacts check failed', result);
    }
  }
}
