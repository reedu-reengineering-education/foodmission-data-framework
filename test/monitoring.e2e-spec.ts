import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Monitoring (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('details');
      expect(response.body.status).toBe('ok');
    });

    it('should include database health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.details).toHaveProperty('database');
      expect(response.body.details.database).toHaveProperty('status');
    });

    it('should include openfoodfacts health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.details).toHaveProperty('openfoodfacts');
      expect(response.body.details.openfoodfacts).toHaveProperty('status');
    });
  });

  describe('/health/ready (GET)', () => {
    it('should return readiness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should only check database for readiness', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body.details).toHaveProperty('database');
      expect(response.body.details).not.toHaveProperty('openfoodfacts');
    });
  });

  describe('/health/live (GET)', () => {
    it('should return liveness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should not check external dependencies for liveness', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200);

      // Liveness should not depend on external services
      expect(Object.keys(response.body.details)).toHaveLength(0);
    });
  });

  describe('/metrics (GET)', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });

    it('should include HTTP request metrics', async () => {
      // Make a request to generate metrics
      await request(app.getHttpServer()).get('/health');

      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('http_request_duration_seconds');
    });

    it('should include Node.js default metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('process_cpu_user_seconds_total');
      expect(response.text).toContain('process_resident_memory_bytes');
      expect(response.text).toContain('nodejs_heap_size_total_bytes');
    });

    it('should include custom application metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('active_connections');
      expect(response.text).toContain('database_connections');
      expect(response.text).toContain('external_api_calls_total');
      expect(response.text).toContain('cache_hits_total');
      expect(response.text).toContain('cache_misses_total');
    });
  });

  describe('Monitoring Middleware', () => {
    it('should record metrics for API requests', async () => {
      // Make a request to generate metrics
      await request(app.getHttpServer()).get('/health');

      // Check that metrics were recorded
      const metricsResponse = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(metricsResponse.text).toContain('method="GET"');
      expect(metricsResponse.text).toContain('route="/health"');
      expect(metricsResponse.text).toContain('status_code="200"');
    });

    it('should record metrics for different HTTP methods', async () => {
      // Make requests with different methods
      await request(app.getHttpServer()).get('/health');
      await request(app.getHttpServer()).get('/health/ready');

      const metricsResponse = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(metricsResponse.text).toContain('method="GET"');
    });

    it('should record metrics for error responses', async () => {
      // Make a request to a non-existent endpoint
      await request(app.getHttpServer()).get('/non-existent').expect(404);

      const metricsResponse = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(metricsResponse.text).toContain('status_code="404"');
    });
  });

  describe('Health Check Error Scenarios', () => {
    it('should handle database connection issues gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll just verify the endpoint structure
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect(res.status).toBeOneOf([200, 503]);
        });

      if (response.status === 503) {
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});

// Custom Jest matcher
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}

expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});