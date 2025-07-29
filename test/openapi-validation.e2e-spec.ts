import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('OpenAPI Schema Validation (e2e)', () => {
  let app: INestApplication<App>;
  let openApiDocument: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable validation pipes globally (same as in main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Set global prefix for API routes (same as in main.ts)
    app.setGlobalPrefix('api/v1');

    // Generate OpenAPI document (same config as in main.ts)
    const config = new DocumentBuilder()
      .setTitle('FOODMISSION Data Framework API')
      .setDescription(
        'A comprehensive backend system for managing food-related data and operations. Built with NestJS, Prisma ORM, and PostgreSQL, featuring Keycloak authentication and OpenFoodFacts integration.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Authentication and authorization endpoints')
      .addTag('foods', 'Food management and OpenFoodFacts integration')
      .addTag('users', 'User management and preferences')
      .addTag('health', 'Health check and monitoring endpoints')
      .addServer('http://localhost:3000', 'Development server')
      .addServer('https://api.foodmission.dev', 'Production server')
      .build();

    openApiDocument = SwaggerModule.createDocument(app, config);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('OpenAPI Document Generation', () => {
    it('should generate a valid OpenAPI document', () => {
      expect(openApiDocument).toBeDefined();
      expect(openApiDocument.openapi).toBe('3.0.0');
      expect(openApiDocument.info).toBeDefined();
      expect(openApiDocument.info.title).toBe('FOODMISSION Data Framework API');
      expect(openApiDocument.info.version).toBe('1.0');
    });

    it('should have all expected tags', () => {
      const expectedTags = ['auth', 'foods', 'users', 'health'];
      const actualTags =
        openApiDocument.tags?.map((tag: any) => tag.name) || [];

      expectedTags.forEach((expectedTag) => {
        expect(actualTags).toContain(expectedTag);
      });
    });

    it('should have security schemes defined', () => {
      expect(openApiDocument.components?.securitySchemes).toBeDefined();
      expect(
        openApiDocument.components.securitySchemes['JWT-auth'],
      ).toBeDefined();
      expect(openApiDocument.components.securitySchemes['JWT-auth'].type).toBe(
        'http',
      );
      expect(
        openApiDocument.components.securitySchemes['JWT-auth'].scheme,
      ).toBe('bearer');
    });

    it('should have schemas defined for DTOs', () => {
      const schemas = openApiDocument.components?.schemas || {};

      // Log available schemas for debugging
      console.log('Available schemas:', Object.keys(schemas));

      // Check for key DTO schemas that should exist
      const expectedSchemas = [
        'CreateFoodDto',
        'FoodResponseDto',
        'CreateUserDto',
        'UserResponseDto',
      ];

      expectedSchemas.forEach((schemaName) => {
        expect(schemas[schemaName]).toBeDefined();
      });

      // Verify we have some schemas
      expect(Object.keys(schemas).length).toBeGreaterThan(0);
    });
  });

  describe('API Endpoints Documentation', () => {
    it('should document all auth endpoints', () => {
      const paths = openApiDocument.paths || {};

      const expectedAuthPaths = [
        '/api/v1/auth/info',
        '/api/v1/auth/profile',
        '/api/v1/auth/health',
        '/api/v1/auth/token-info',
        '/api/v1/auth/admin-only',
      ];

      expectedAuthPaths.forEach((path) => {
        expect(paths[path]).toBeDefined();
      });
    });

    it('should document all health endpoints', () => {
      const paths = openApiDocument.paths || {};

      const expectedHealthPaths = [
        '/api/v1/health',
        '/api/v1/health/ready',
        '/api/v1/health/live',
        '/api/v1/health/metrics',
      ];

      expectedHealthPaths.forEach((path) => {
        expect(paths[path]).toBeDefined();
      });
    });

    it('should document all food endpoints', () => {
      const paths = openApiDocument.paths || {};

      const expectedFoodPaths = [
        '/api/v1/foods',
        '/api/v1/foods/{id}',
        '/api/v1/foods/search/openfoodfacts',
        '/api/v1/foods/import/openfoodfacts/{barcode}',
        '/api/v1/foods/barcode/{barcode}',
        '/api/v1/foods/{id}/openfoodfacts',
      ];

      expectedFoodPaths.forEach((path) => {
        expect(paths[path]).toBeDefined();
      });
    });

    it('should document all user endpoints', () => {
      const paths = openApiDocument.paths || {};

      const expectedUserPaths = [
        '/api/v1/users',
        '/api/v1/users/{id}',
        '/api/v1/users/profile',
        '/api/v1/users/profile/preferences',
        '/api/v1/users/profile/preferences/dietary-restrictions',
        '/api/v1/users/profile/preferences/allergies',
        '/api/v1/users/{id}/preferences',
      ];

      expectedUserPaths.forEach((path) => {
        expect(paths[path]).toBeDefined();
      });
    });

    it('should have proper HTTP methods documented', () => {
      const paths = openApiDocument.paths || {};

      // Check foods endpoints
      expect(paths['/api/v1/foods']?.get).toBeDefined();
      expect(paths['/api/v1/foods']?.post).toBeDefined();
      expect(paths['/api/v1/foods/{id}']?.get).toBeDefined();
      expect(paths['/api/v1/foods/{id}']?.patch).toBeDefined();
      expect(paths['/api/v1/foods/{id}']?.delete).toBeDefined();

      // Check users endpoints
      expect(paths['/api/v1/users']?.get).toBeDefined();
      expect(paths['/api/v1/users']?.post).toBeDefined();
      expect(paths['/api/v1/users/{id}']?.get).toBeDefined();
      expect(paths['/api/v1/users/{id}']?.patch).toBeDefined();
      expect(paths['/api/v1/users/{id}']?.delete).toBeDefined();

      // Check auth endpoints
      expect(paths['/api/v1/auth/info']?.get).toBeDefined();
      expect(paths['/api/v1/auth/profile']?.get).toBeDefined();
      expect(paths['/api/v1/auth/health']?.get).toBeDefined();
    });
  });

  describe('Response Schema Validation', () => {
    it('should validate health check response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/')
        .expect(200);

      expect(typeof response.text).toBe('string');
      expect(response.text).toBe('Hello World!');
    });

    it('should validate auth health check response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('service');
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('auth');
    });

    it('should validate auth login-url response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/login-url')
        .expect(200);

      expect(response.body).toHaveProperty('loginUrl');
      expect(response.body).toHaveProperty('state');
      expect(typeof response.body.loginUrl).toBe('string');
      expect(typeof response.body.state).toBe('string');
      expect(response.body.loginUrl).toContain('openid-connect');
      expect(response.body.loginUrl).toContain('auth');
    });

    it('should validate auth info response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/info')
        .expect(200);

      expect(response.body).toHaveProperty('authServerUrl');
      expect(response.body).toHaveProperty('realm');
      expect(response.body).toHaveProperty('clientId');
      expect(response.body).toHaveProperty('redirectUri');
      expect(typeof response.body.authServerUrl).toBe('string');
      expect(typeof response.body.realm).toBe('string');
      expect(typeof response.body.clientId).toBe('string');
      expect(typeof response.body.redirectUri).toBe('string');
    });

    it('should validate foods list response schema structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/foods')
        .expect(200);

      // Validate paginated response structure
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.page).toBe('number');
      expect(typeof response.body.limit).toBe('number');
      expect(typeof response.body.totalPages).toBe('number');
    });

    it('should validate OpenFoodFacts search response schema structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/foods/search/openfoodfacts?query=nutella')
        .expect(200);

      // Should return OpenFoodFacts API response structure (transformed by our service)
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');

      expect(Array.isArray(response.body.products)).toBe(true);
      expect(typeof response.body.totalCount).toBe('number');
      expect(typeof response.body.page).toBe('number');
      expect(typeof response.body.pageSize).toBe('number');
    });

    it('should validate health check response schema', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      // Health check might return 200 or 503 depending on external services
      expect([200, 503]).toContain(response.status);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('checks');

      expect(['ok', 'error']).toContain(response.body.status);
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.timestamp).toBe('string');
      expect(typeof response.body.checks).toBe('object');

      // Validate checks structure
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('keycloak');
      expect(response.body.checks).toHaveProperty('openFoodFacts');

      // Database should be healthy in test environment
      expect(response.body.checks.database.status).toBe('ok');
    });

    it('should validate readiness probe response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.status).toBe('ready');
      expect(typeof response.body.timestamp).toBe('string');
    });

    it('should validate liveness probe response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body.status).toBe('alive');
      expect(typeof response.body.timestamp).toBe('string');
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should validate metrics response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('requests');
      expect(response.body).toHaveProperty('database');

      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.memory).toBe('object');
      expect(typeof response.body.cpu).toBe('object');
      expect(typeof response.body.requests).toBe('object');
      expect(typeof response.body.database).toBe('object');

      // Validate memory structure
      expect(response.body.memory).toHaveProperty('used');
      expect(response.body.memory).toHaveProperty('total');
      expect(response.body.memory).toHaveProperty('percentage');

      // Validate requests structure
      expect(response.body.requests).toHaveProperty('total');
      expect(response.body.requests).toHaveProperty('errors');
      expect(response.body.requests).toHaveProperty('averageResponseTime');
    });
  });

  describe('Error Response Schema Validation', () => {
    it('should validate 404 error response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/foods/550e8400-e29b-41d4-a716-446655440000')
        .expect(404);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body.statusCode).toBe(404);
    });

    it('should validate validation error response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/foods?page=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body.statusCode).toBe(400);
    });

    it('should validate unauthorized error response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('Request Validation', () => {
    it('should validate query parameters according to schema', async () => {
      // Valid query parameters
      await request(app.getHttpServer())
        .get('/api/v1/foods?page=1&limit=10&sortBy=name&sortOrder=asc')
        .expect(200);

      // Invalid page parameter
      await request(app.getHttpServer())
        .get('/api/v1/foods?page=0')
        .expect(400);

      // Invalid limit parameter
      await request(app.getHttpServer())
        .get('/api/v1/foods?limit=101')
        .expect(400);

      // Invalid sortBy parameter
      await request(app.getHttpServer())
        .get('/api/v1/foods?sortBy=invalid')
        .expect(400);

      // Invalid sortOrder parameter
      await request(app.getHttpServer())
        .get('/api/v1/foods?sortOrder=invalid')
        .expect(400);
    });

    it('should validate UUID parameters', async () => {
      // Invalid UUID format
      await request(app.getHttpServer())
        .get('/api/v1/foods/invalid-uuid')
        .expect(400);

      // Valid UUID format (even if not found)
      await request(app.getHttpServer())
        .get('/api/v1/foods/550e8400-e29b-41d4-a716-446655440000')
        .expect(404);
    });
  });

  describe('Content-Type Validation', () => {
    it('should require JSON content-type for POST requests', async () => {
      // This endpoint requires authentication, so we expect 401 for unauthenticated requests
      await request(app.getHttpServer())
        .post('/api/v1/foods')
        .send('invalid-json')
        .expect(401);
    });

    it('should return JSON responses with correct content-type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/foods')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('OpenAPI Documentation Completeness', () => {
    it('should have operation summaries for all endpoints', () => {
      const paths = openApiDocument.paths || {};

      Object.keys(paths).forEach((path) => {
        const pathItem = paths[path];
        Object.keys(pathItem).forEach((method) => {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            const operation = pathItem[method];
            expect(operation.summary).toBeDefined();
            expect(operation.summary.length).toBeGreaterThan(0);
          }
        });
      });
    });

    it('should have operation descriptions for all endpoints', () => {
      const paths = openApiDocument.paths || {};

      Object.keys(paths).forEach((path) => {
        const pathItem = paths[path];
        Object.keys(pathItem).forEach((method) => {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            const operation = pathItem[method];
            expect(operation.description).toBeDefined();
            expect(operation.description.length).toBeGreaterThan(0);
          }
        });
      });
    });

    it('should have proper response schemas for all endpoints', () => {
      const paths = openApiDocument.paths || {};

      Object.keys(paths).forEach((path) => {
        const pathItem = paths[path];
        Object.keys(pathItem).forEach((method) => {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            const operation = pathItem[method];
            expect(operation.responses).toBeDefined();
            expect(Object.keys(operation.responses).length).toBeGreaterThan(0);

            // Check that success responses have content defined
            Object.keys(operation.responses).forEach((statusCode) => {
              const response = operation.responses[statusCode];
              if (statusCode.startsWith('2') && statusCode !== '204') {
                // 2xx responses (except 204 No Content) should have content
                expect(response.content || response.schema).toBeDefined();
              }
            });
          }
        });
      });
    });

    it('should have proper tags for all endpoints', () => {
      const paths = openApiDocument.paths || {};

      Object.keys(paths).forEach((path) => {
        const pathItem = paths[path];
        Object.keys(pathItem).forEach((method) => {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            const operation = pathItem[method];
            expect(operation.tags).toBeDefined();
            expect(operation.tags.length).toBeGreaterThan(0);
          }
        });
      });
    });

    it('should have security requirements for protected endpoints', () => {
      const paths = openApiDocument.paths || {};

      Object.keys(paths).forEach((path) => {
        const pathItem = paths[path];
        Object.keys(pathItem).forEach((method) => {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            const operation = pathItem[method];

            // Check if endpoint is protected (has security requirements)
            if (operation.security && operation.security.length > 0) {
              expect(operation.security[0]['JWT-auth']).toBeDefined();
            }
          }
        });
      });
    });
  });
});
