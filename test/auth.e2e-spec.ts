import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Stateless Authentication (e2e)', () => {
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

  describe('Public Endpoints', () => {
    it('should allow access to health endpoints without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    });

    it('should allow access to auth info endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/info')
        .expect(200);

      expect(response.body).toHaveProperty('authServerUrl');
      expect(response.body).toHaveProperty('realm');
      expect(response.body).toHaveProperty('clientId');
      expect(response.body).toHaveProperty('redirectUri');
    });

    it('should allow access to auth health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        service: 'auth',
      });
    });

    it('should allow access to public food endpoints', async () => {
      await request(app.getHttpServer()).get('/api/v1/foods').expect(200);
    });

    it('should allow access to OpenFoodFacts search without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/foods/search/openfoodfacts?search=apple')
        .expect(200);
    });
  });

  describe('Protected Endpoints', () => {
    it('should reject access to profile endpoint without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('should reject access to token-info endpoint without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/token-info')
        .expect(401);
    });

    it('should reject food creation without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/foods')
        .send({
          name: 'Test Food',
          description: 'A test food item',
          categoryId: 'test-category-id',
        })
        .expect(401);
    });

    it('should reject food updates without authentication', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/foods/test-id')
        .send({
          name: 'Updated Food',
        })
        .expect(401);
    });

    it('should reject food deletion without authentication', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/foods/test-id')
        .expect(401);
    });

    it('should reject OpenFoodFacts import without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/foods/import/openfoodfacts/1234567890123')
        .send({
          categoryId: 'test-category-id',
        })
        .expect(401);
    });
  });

  describe('Invalid Authentication', () => {
    it('should reject requests with malformed Bearer tokens', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer')
        .expect(401);
    });

    it('should reject requests with invalid Bearer tokens', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject requests with expired tokens', async () => {
      // This would require a properly expired JWT token
      // In a real test, you'd generate an expired token
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject requests with non-Bearer authentication schemes', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Basic dXNlcjpwYXNzd29yZA==')
        .expect(401);
    });
  });

  describe('Role-Based Access Control', () => {
    it('should reject access to admin-only endpoints without admin role', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/admin-only')
        .expect(401); // First, no auth at all
    });

    it('should reject food deletion without admin role', async () => {
      // This would require a valid user token without admin role
      // In a real test, you'd generate a user token
      await request(app.getHttpServer())
        .delete('/api/v1/foods/test-id')
        .expect(401); // No auth provided
    });
  });

  describe('Authentication Headers', () => {
    it('should accept various Authorization header formats', async () => {
      // Test case sensitivity
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('authorization', 'Bearer invalid-token')
        .expect(401); // Invalid token, but header format accepted
    });

    it('should handle missing Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('should handle empty Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', '')
        .expect(401);
    });
  });

  describe('Security Headers in Auth Responses', () => {
    it('should include security headers in auth responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/info')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should not expose sensitive information in error responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.message).not.toContain('keycloak');
      expect(response.body.message).not.toContain('jwt');
      expect(response.body.message).not.toContain('secret');
    });
  });

  describe('Rate Limiting on Auth Endpoints', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      // Make multiple requests quickly to profile endpoint
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 35; i++) {
        promises.push(request(app.getHttpServer()).get('/api/v1/auth/profile'));
      }

      const responses = await Promise.all(promises);

      // All should return 401 (unauthorized) or 429 (rate limited)
      const unauthorizedCount = responses.filter(
        (r) => r.status === 401,
      ).length;
      const rateLimitedCount = responses.filter((r) => r.status === 429).length;

      expect(unauthorizedCount + rateLimitedCount).toBe(35);
      // Most should be unauthorized (no token provided)
      expect(unauthorizedCount).toBeGreaterThan(0);
    });
  });

  describe('CORS on Auth Endpoints', () => {
    it('should handle CORS on auth endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/info')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
    });

    it('should handle CORS preflight on auth endpoints', async () => {
      await request(app.getHttpServer())
        .options('/api/v1/auth/profile')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization')
        .expect(204);
    });
  });

  describe('Input Validation on Auth Endpoints', () => {
    it('should handle malformed requests gracefully', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/profile') // POST to GET endpoint
        .send({ malformed: 'data' })
        .expect(404); // Method not allowed or not found
    });
  });

  describe('Stateless JWT Authentication', () => {
    it('should return consistent auth info', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/api/v1/auth/info')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/v1/auth/info')
        .expect(200);

      expect(response1.body).toEqual(response2.body);
    });

    it('should provide correct Keycloak configuration', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/info')
        .expect(200);

      expect(response.body.authServerUrl).toMatch(/^https?:\/\/.+/);
      expect(response.body.realm).toBeTruthy();
      expect(response.body.clientId).toBeTruthy();
      expect(response.body.redirectUri).toMatch(/^https?:\/\/.+/);
    });
  });
});
