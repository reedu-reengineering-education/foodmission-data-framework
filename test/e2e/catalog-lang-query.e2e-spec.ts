import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CatalogController } from '../../src/catalog/controllers/catalog.controller';
import { CatalogService } from '../../src/catalog/services/catalog.service';
import {
  createAuthGuardMock,
  createControllerE2eTestApp,
  DEFAULT_CATALOG_AUTH_USER,
} from './helpers/controller-e2e-helpers';

describe('Catalog lang query validation (e2e)', () => {
  let app: INestApplication;

  const authUser = DEFAULT_CATALOG_AUTH_USER;

  const paginatedResponse = {
    data: [
      { code: 'US-CA', label: 'Kalifornien', meta: { countryCode: 'US' } },
    ],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const catalogServiceMock = {
    listCountries: jest.fn().mockReturnValue({
      data: [{ code: 'DE', label: 'Deutschland' }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
    listRegions: jest.fn().mockReturnValue(paginatedResponse),
  };

  beforeAll(async () => {
    const appSetup = await createControllerE2eTestApp({
      controllers: [CatalogController],
      providers: [{ provide: CatalogService, useValue: catalogServiceMock }],
      authGuardMock: createAuthGuardMock(authUser),
    });

    app = appSetup.app;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    catalogServiceMock.listCountries.mockClear();
    catalogServiceMock.listRegions.mockClear();
  });

  it('GET /catalog/countries accepts lang query under whitelist validation', async () => {
    await request(app.getHttpServer())
      .get('/catalog/countries?page=1&limit=10&lang=de')
      .expect(200);

    expect(catalogServiceMock.listCountries).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      lang: 'de',
    });
  });

  it('GET /catalog/regions accepts lang and countryCode query under whitelist validation', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/regions?page=1&limit=10&countryCode=US&lang=de')
      .expect(200);

    expect(catalogServiceMock.listRegions).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      countryCode: 'US',
      lang: 'de',
    });
    expect(res.body).toEqual(paginatedResponse);
  });

  it('GET /catalog/regions rejects unsupported lang values', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/regions?page=1&limit=10&countryCode=US&lang=xx')
      .expect(400);

    expect(catalogServiceMock.listRegions).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body.message)).not.toContain(
      'property lang should not exist',
    );
  });
});
