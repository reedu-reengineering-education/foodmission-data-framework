import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

@Injectable()
export class KeycloakHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly configService: ConfigService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const check = this.healthIndicatorService.check(key);
    const keycloakUrl =
      this.configService.get<string>('KEYCLOAK_AUTH_SERVER_URL') ||
      this.configService.get<string>('KEYCLOAK_BASE_URL');
    const realm = this.configService.get<string>('KEYCLOAK_REALM');

    try {
      const response = await fetch(
        `${keycloakUrl}/realms/${realm}/.well-known/openid-configuration`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        },
      );

      if (response.ok) {
        return check.up();
      }

      return check.down({ statusCode: response.status });
    } catch (error) {
      return check.down({ message: (error as Error).message });
    }
  }
}
