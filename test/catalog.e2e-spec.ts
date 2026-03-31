import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CatalogController } from '../src/catalog/controllers/catalog.controller';
import { CatalogService } from '../src/catalog/services/catalog.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../src/common/guards/database-auth.guards';
import { createTestApp, closeTestApp } from './test-utils/e2e-helpers';

describe('Catalog (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [CatalogService],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = await createTestApp(moduleFixture);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('GET /catalog/startup', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/startup')
      .expect(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          genders: expect.any(Array),
          activityLevels: expect.any(Array),
          educationLevels: expect.any(Array),
          annualIncomeLevels: expect.any(Array),
          dietaryPreferences: expect.any(Array),
          shoppingResponsibilities: expect.any(Array),
        }),
      }),
    );
  });

  const listEndpoints = [
    '/catalog/genders',
    '/catalog/activity-levels',
    '/catalog/education-levels',
    '/catalog/annual-income-levels',
    '/catalog/dietary-preferences',
    '/catalog/shopping-responsibilities',
    '/catalog/units',
    '/catalog/type-of-meals',
    '/catalog/meal-categories',
    '/catalog/meal-courses',
    '/catalog/group-roles',
  ] as const;

  it.each(listEndpoints)('GET %s (list endpoints)', async (path) => {
    const res = await request(app.getHttpServer()).get(path).expect(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length) {
      expect(res.body.data[0]).toEqual(
        expect.objectContaining({
          code: expect.any(String),
          label: expect.any(String),
        }),
      );
    }
  });

  it('GET /catalog/languages (paginated)', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/languages?page=1&limit=5')
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(Number(res.body.total)).toBeGreaterThan(0);
    expect(Number(res.body.totalPages)).toBeGreaterThan(0);
    expect(String(res.body.page)).toBe('1');
    expect(String(res.body.limit)).toBe('5');
  });

  it('GET /catalog/countries (paginated)', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/countries?page=1&limit=5')
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(Number(res.body.total)).toBeGreaterThan(0);
    expect(Number(res.body.totalPages)).toBeGreaterThan(0);
    expect(String(res.body.page)).toBe('1');
    expect(String(res.body.limit)).toBe('5');
  });

  it('GET /catalog/regions (happy path with countryCode)', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/regions?page=1&limit=5&countryCode=DE')
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(Number(res.body.total)).toBeGreaterThan(0);
    expect(Number(res.body.totalPages)).toBeGreaterThan(0);
    expect(String(res.body.page)).toBe('1');
    expect(String(res.body.limit)).toBe('5');
  });
});
