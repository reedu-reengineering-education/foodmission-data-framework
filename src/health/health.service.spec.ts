import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';
import { PrismaService } from '../database/prisma.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('HealthService', () => {
  let service: HealthService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prismaService = module.get(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    
    // Wait a bit to ensure service has some uptime
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  describe('getHealth', () => {
    it('should return healthy status when all checks pass', async () => {
      // Mock successful database check
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      
      // Mock successful external service checks
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // Keycloak
        .mockResolvedValueOnce({ ok: true }); // OpenFoodFacts

      const result = await service.getHealth();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.version).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(result.checks.database.status).toBe('ok');
      expect(result.checks.keycloak.status).toBe('ok');
      expect(result.checks.openFoodFacts.status).toBe('ok');
    });

    it('should throw ServiceUnavailableException when database check fails', async () => {
      // Mock failed database check
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Database error'));
      
      // Mock successful external service checks
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // Keycloak
        .mockResolvedValueOnce({ ok: true }); // OpenFoodFacts

      await expect(service.getHealth()).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when keycloak check fails in non-test environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Mock successful database check
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      
      // Mock failed keycloak check
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false }) // Keycloak
        .mockResolvedValueOnce({ ok: true }); // OpenFoodFacts

      await expect(service.getHealth()).rejects.toThrow(ServiceUnavailableException);

      process.env.NODE_ENV = originalEnv;
    });

    it('should only check database in test environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      // Mock successful database check
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      
      // Mock failed external service checks (should be ignored in test env)
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false }) // Keycloak
        .mockResolvedValueOnce({ ok: false }); // OpenFoodFacts

      const result = await service.getHealth();

      expect(result.status).toBe('ok');
      expect(result.checks.database.status).toBe('ok');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getReadiness', () => {
    it('should return ready status when database is ready', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await service.getReadiness();

      expect(result.status).toBe('ready');
      expect(result.timestamp).toBeDefined();
    });

    it('should throw ServiceUnavailableException when database is not ready', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.getReadiness()).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getLiveness', () => {
    it('should always return alive status', async () => {
      // Wait a bit to ensure uptime is greater than 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await service.getLiveness();

      expect(result.status).toBe('alive');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMetrics', () => {
    it('should return system metrics', async () => {
      // Wait a bit to ensure uptime is greater than 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await service.getMetrics();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.memory).toBeDefined();
      expect(result.memory.used).toBeGreaterThan(0);
      expect(result.memory.total).toBeGreaterThan(0);
      expect(result.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(result.cpu).toBeDefined();
      expect(result.requests).toBeDefined();
      expect(result.requests.total).toBe(0); // Initially 0
      expect(result.requests.errors).toBe(0); // Initially 0
      expect(result.database).toBeDefined();
    });
  });

  describe('trackRequest', () => {
    it('should track successful requests', async () => {
      service.trackRequest(100, false);
      service.trackRequest(200, false);

      const metrics = await service.getMetrics();

      expect(metrics.requests.total).toBe(2);
      expect(metrics.requests.errors).toBe(0);
      expect(metrics.requests.averageResponseTime).toBe(150);
    });

    it('should track error requests', async () => {
      service.trackRequest(100, false);
      service.trackRequest(200, true);

      const metrics = await service.getMetrics();

      expect(metrics.requests.total).toBe(2);
      expect(metrics.requests.errors).toBe(1);
      expect(metrics.requests.averageResponseTime).toBe(150);
    });
  });

  describe('checkDatabase', () => {
    it('should return ok status when database query succeeds', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      // Access private method for testing
      const result = await (service as any).checkDatabase();

      expect(result.status).toBe('ok');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should return error status when database query fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Database error'));

      const result = await (service as any).checkDatabase();

      expect(result.status).toBe('error');
      expect(result.responseTime).toBeGreaterThan(0);
    });
  });

  describe('checkKeycloak', () => {
    it('should return ok status when keycloak is accessible', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const result = await (service as any).checkKeycloak();

      expect(result.status).toBe('ok');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/.well-known/openid_configuration'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        })
      );
    });

    it('should return error status when keycloak is not accessible', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      const result = await (service as any).checkKeycloak();

      expect(result.status).toBe('error');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should return error status when keycloak request throws', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await (service as any).checkKeycloak();

      expect(result.status).toBe('error');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should use environment variables for keycloak URL', async () => {
      const originalUrl = process.env.KEYCLOAK_AUTH_SERVER_URL;
      const originalRealm = process.env.KEYCLOAK_REALM;
      
      process.env.KEYCLOAK_AUTH_SERVER_URL = 'https://custom-keycloak.com';
      process.env.KEYCLOAK_REALM = 'custom-realm';

      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await (service as any).checkKeycloak();

      expect(fetch).toHaveBeenCalledWith(
        'https://custom-keycloak.com/realms/custom-realm/.well-known/openid_configuration',
        expect.any(Object)
      );

      process.env.KEYCLOAK_AUTH_SERVER_URL = originalUrl;
      process.env.KEYCLOAK_REALM = originalRealm;
    });
  });

  describe('checkOpenFoodFacts', () => {
    it('should return ok status when OpenFoodFacts is accessible', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const result = await (service as any).checkOpenFoodFacts();

      expect(result.status).toBe('ok');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(fetch).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/api/v0/product/3017620422003.json',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        })
      );
    });

    it('should return error status when OpenFoodFacts is not accessible', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      const result = await (service as any).checkOpenFoodFacts();

      expect(result.status).toBe('error');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should return error status when OpenFoodFacts request throws', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await (service as any).checkOpenFoodFacts();

      expect(result.status).toBe('error');
      expect(result.responseTime).toBeGreaterThan(0);
    });
  });
});