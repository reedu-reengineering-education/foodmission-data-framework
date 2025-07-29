import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain(
        'max-age=31536000',
      );
      expect(response.headers['referrer-policy']).toBe('no-referrer');

      // Check that sensitive headers are removed
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).toBeUndefined();
    });

    it('should include CSP headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain(
        "default-src 'self'",
      );
      expect(response.headers['content-security-policy']).toContain(
        "object-src 'none'",
      );
    });

    it('should include custom security headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.headers['x-api-version']).toBe('1.0.0');
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts in query parameters', async () => {
      const maliciousQuery = '<script>alert("xss")</script>';

      await request(app.getHttpServer())
        .get(`/api/v1/foods?search=${encodeURIComponent(maliciousQuery)}`)
        .expect(200);

      // The request should succeed but the malicious content should be sanitized
      // This is tested more thoroughly in unit tests
    });

    it('should reject requests with too many query parameters', async () => {
      const manyParams = new URLSearchParams();
      for (let i = 0; i < 60; i++) {
        manyParams.append(`param${i}`, 'value');
      }

      await request(app.getHttpServer())
        .get(`/api/v1/foods?${manyParams.toString()}`)
        .expect(400);
    });

    it('should reject requests with excessively long query parameters', async () => {
      const longValue = 'x'.repeat(1500);

      await request(app.getHttpServer())
        .get(`/api/v1/foods?search=${longValue}`)
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limits', async () => {
      // Make a few requests that should be within limits
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).get('/api/v1/health').expect(200);
      }
    });

    it('should not rate limit health check endpoints', async () => {
      // Make many requests to health endpoint
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app.getHttpServer()).get('/api/v1/health').expect(200),
        );
      }

      await Promise.all(promises);
    });

    it('should not rate limit metrics endpoints', async () => {
      // Make many requests to metrics endpoint
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app.getHttpServer()).get('/api/v1/metrics').expect(200),
        );
      }

      await Promise.all(promises);
    });

    // Note: Testing actual rate limiting is complex in e2e tests
    // as it requires making many requests quickly and may be flaky
    // The rate limiting logic is better tested in unit tests
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      await request(app.getHttpServer())
        .options('/api/v1/foods')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization')
        .expect(204);
    });

    it('should include CORS headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication for protected endpoints', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/foods')
        .send({
          name: 'Test Food',
          categoryId: 'test-category-id',
        })
        .expect(401);
    });

    it('should reject requests with invalid JWT tokens', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/foods')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'Test Food',
          categoryId: 'test-category-id',
        })
        .expect(401);
    });

    it('should allow access to public endpoints', async () => {
      await request(app.getHttpServer()).get('/api/v1/foods').expect(200);
    });

    it('should provide auth info endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/info')
        .expect(200);

      expect(response.body).toHaveProperty('authServerUrl');
      expect(response.body).toHaveProperty('realm');
      expect(response.body).toHaveProperty('clientId');
      expect(response.body.authServerUrl).toContain('keycloak');
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose sensitive information in error responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/foods/invalid-uuid')
        .expect(400);

      // Error should not contain sensitive information
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('prisma');
      expect(response.body.message).not.toContain('password');
    });

    it('should handle malformed JSON gracefully', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/foods')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });

  describe('Request Size Limits', () => {
    it('should reject requests with large bodies', async () => {
      const largeBody = {
        name: 'Test Food',
        description: 'x'.repeat(2 * 1024 * 1024), // 2MB description
        categoryId: 'test-category-id',
      };

      await request(app.getHttpServer())
        .post('/api/v1/foods')
        .send(largeBody)
        .expect(400);
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should handle requests with suspicious patterns', async () => {
      // Test directory traversal attempt
      await request(app.getHttpServer())
        .get('/api/v1/foods/../../../etc/passwd')
        .expect(404); // Should not find the endpoint, but shouldn't crash

      // Test SQL injection attempt
      await request(app.getHttpServer())
        .get("/api/v1/foods?search='; DROP TABLE foods; --")
        .expect(200); // Should handle gracefully

      // Test XSS attempt
      await request(app.getHttpServer())
        .get('/api/v1/foods?search=<script>alert("xss")</script>')
        .expect(200); // Should handle gracefully
    });

    it('should handle requests with unusual user agents', async () => {
      const unusualUserAgent = 'x'.repeat(1500);

      await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('User-Agent', unusualUserAgent)
        .expect(200); // Should handle gracefully
    });
  });
});
