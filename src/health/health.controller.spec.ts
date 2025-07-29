import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  HealthCheckResult,
  HealthCheckStatus,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './database.health';
import { OpenFoodFactsHealthIndicator } from './openfoodfacts.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let databaseHealth: jest.Mocked<DatabaseHealthIndicator>;
  let openFoodFactsHealth: jest.Mocked<OpenFoodFactsHealthIndicator>;

  const mockHealthResult: HealthCheckResult = {
    status: 'ok' as HealthCheckStatus,
    info: {
      database: { status: 'up' },
      openfoodfacts: { status: 'up' },
    },
    error: {},
    details: {
      database: { status: 'up' },
      openfoodfacts: { status: 'up' },
    },
  };

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockDatabaseHealth = {
      isHealthy: jest.fn(),
    };

    const mockOpenFoodFactsHealth = {
      isHealthy: jest.fn(),
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
          provide: OpenFoodFactsHealthIndicator,
          useValue: mockOpenFoodFactsHealth,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    databaseHealth = module.get(DatabaseHealthIndicator);
    openFoodFactsHealth = module.get(OpenFoodFactsHealthIndicator);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health check result', async () => {
      healthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should call database and openfoodfacts health indicators', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        // Execute the health check functions
        await Promise.all(checks.map((check) => check()));
        return mockHealthResult;
      });

      databaseHealth.isHealthy.mockResolvedValue({
        database: { status: 'up' },
      });
      openFoodFactsHealth.isHealthy.mockResolvedValue({
        openfoodfacts: { status: 'up' },
      });

      await controller.check();

      expect(databaseHealth.isHealthy).toHaveBeenCalledWith('database');
      expect(openFoodFactsHealth.isHealthy).toHaveBeenCalledWith(
        'openfoodfacts',
      );
    });
  });

  describe('readiness', () => {
    it('should return readiness check result', async () => {
      const readinessResult: HealthCheckResult = {
        status: 'ok' as HealthCheckStatus,
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };

      healthCheckService.check.mockResolvedValue(readinessResult);

      const result = await controller.readiness();

      expect(result).toEqual(readinessResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
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
