import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  HealthCheckResult,
  HealthCheckStatus,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './database.health';
import { KeycloakHealthIndicator } from './keycloak.health';
import { RedisHealthIndicator } from './redis.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let databaseHealth: jest.Mocked<DatabaseHealthIndicator>;

  const mockHealthResult: HealthCheckResult = {
    status: 'ok' as HealthCheckStatus,
    info: {
      database: { status: 'up' },
    },
    error: {},
    details: {
      database: { status: 'up' },
    },
  };

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockDatabaseHealth = {
      isHealthy: jest.fn(),
    };

    const mockKeycloakHealth = {
      isHealthy: jest.fn(),
    };

    const mockRedisHealth = {
      isHealthy: jest.fn(),
      isConfigured: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: DatabaseHealthIndicator,
          useValue: mockDatabaseHealth,
        },
        {
          provide: KeycloakHealthIndicator,
          useValue: mockKeycloakHealth,
        },
        {
          provide: RedisHealthIndicator,
          useValue: mockRedisHealth,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    databaseHealth = module.get(DatabaseHealthIndicator);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('readiness', () => {
    it('should return readiness check result', async () => {
      healthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.readiness();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should call database health indicator', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        for (const check of checks) {
          await check();
        }
        return mockHealthResult;
      });

      databaseHealth.isHealthy.mockResolvedValue({
        database: { status: 'up' },
      });

      await controller.readiness();

      expect(databaseHealth.isHealthy).toHaveBeenCalledWith('database');
    });
  });

  describe('liveness', () => {
    it('should return liveness check result', async () => {
      const livenessResult: HealthCheckResult = {
        status: 'ok' as HealthCheckStatus,
        info: {},
        error: {},
        details: {},
      };

      healthCheckService.check.mockResolvedValue(livenessResult);

      const result = await controller.liveness();

      expect(result).toEqual(livenessResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([]);
    });
  });
});
