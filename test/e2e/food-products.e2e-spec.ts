import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { UserContextService } from '../../src/auth/user-context.service';
import { PrismaService } from '../../src/database/prisma.service';
import { FoodProductController } from '../../src/food-products/controllers/food-products.controller';
import { FoodProductRepository } from '../../src/food-products/repositories/food-product.repository';
import { FoodProductService } from '../../src/food-products/services/food-product.service';
import { OpenFoodFactsService } from '../../src/food-products/services/openfoodfacts.service';
import {
  createAuthGuardMock,
  createControllerE2eTestApp,
  DEFAULT_CATALOG_AUTH_USER,
  seedAuthUser,
  setupCatalogDb,
} from './helpers/controller-e2e-helpers';

describe('FoodProducts endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const authUser = DEFAULT_CATALOG_AUTH_USER;

  const openFoodFactsMock = {
    searchProducts: jest.fn(),
    getProductByBarcode: jest.fn(),
  };

  async function seedBaseData() {
    await seedAuthUser(prisma, authUser);
    await prisma.foodProduct.createMany({
      data: [
        {
          id: '00000000-0000-0000-0000-000000000201',
          name: 'Apple',
          barcode: '1111111111111',
          createdBy: authUser.id,
        },
        {
          id: '00000000-0000-0000-0000-000000000202',
          name: 'Banana',
          barcode: '2222222222222',
          createdBy: authUser.id,
        },
      ],
      skipDuplicates: true,
    });
  }

  beforeAll(async () => {
    const db = setupCatalogDb();
    prisma = db.prisma;

    const appSetup = await createControllerE2eTestApp({
      controllers: [FoodProductController],
      providers: [
        FoodProductService,
        FoodProductRepository,
        { provide: PrismaService, useValue: prisma },
        { provide: OpenFoodFactsService, useValue: openFoodFactsMock },
        { provide: UserContextService, useValue: {} },
      ],
      authGuardMock: createAuthGuardMock(authUser),
    });

    app = appSetup.app;
  });

  beforeEach(async () => {
    openFoodFactsMock.searchProducts.mockReset();
    openFoodFactsMock.getProductByBarcode.mockReset();

    await prisma.shoppingListItem.deleteMany();
    await prisma.pantryItem.deleteMany();
    await prisma.mealItem.deleteMany();
    await prisma.recipeIngredient.deleteMany();
    await prisma.foodProduct.deleteMany();
    await prisma.user.deleteMany({ where: { id: authUser.id } });
    await seedBaseData();
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  const itIfDb = (name: string, fn: () => Promise<void>) =>
    it(name, async () => {
      await fn();
    });

  itIfDb('GET /food-products returns paginated list', async () => {
    const res = await request(app.getHttpServer())
      .get('/food-products?page=1&limit=10')
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toEqual(expect.objectContaining({ id: expect.any(String) }));
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
  });

  itIfDb('GET /food-products supports search filter', async () => {
    const res = await request(app.getHttpServer())
      .get('/food-products?search=Apple')
      .expect(200);
    expect(res.body.data.every((p: any) => p.name.includes('Apple'))).toBe(true);
  });

  itIfDb('GET /food-products/:id returns one product', async () => {
    const res = await request(app.getHttpServer())
      .get('/food-products/00000000-0000-0000-0000-000000000201')
      .expect(200);
    expect(res.body.name).toBe('Apple');
  });

  itIfDb('GET /food-products/barcode/:barcode returns one product', async () => {
    const res = await request(app.getHttpServer())
      .get('/food-products/barcode/1111111111111')
      .expect(200);
    expect(res.body.barcode).toBe('1111111111111');
  });

  itIfDb('GET /food-products/search/openfoodfacts delegates to OFF service', async () => {
    openFoodFactsMock.searchProducts.mockResolvedValue({
      products: [{ barcode: '333', name: 'OFF Product' }],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    const res = await request(app.getHttpServer())
      .get('/food-products/search/openfoodfacts?query=food&page=1&pageSize=10')
      .expect(200);

    expect(openFoodFactsMock.searchProducts).toHaveBeenCalled();
    expect(res.body.products).toHaveLength(1);
  });

  itIfDb('POST /food-products creates a new product', async () => {
    const res = await request(app.getHttpServer())
      .post('/food-products')
      .send({
        name: 'Orange',
        barcode: '3333333333333',
      })
      .expect(201);

    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.name).toBe('Orange');
    expect(res.body.barcode).toBe('3333333333333');
  });

  itIfDb(
    'POST /food-products/import/openfoodfacts/:barcode imports external product',
    async () => {
      openFoodFactsMock.getProductByBarcode.mockResolvedValue({
        barcode: '4444444444444',
        name: 'Imported OFF',
        genericName: 'Imported generic',
      });

      const res = await request(app.getHttpServer())
        .post('/food-products/import/openfoodfacts/4444444444444')
        .send({})
        .expect(201);

      expect(openFoodFactsMock.getProductByBarcode).toHaveBeenCalledWith(
        '4444444444444',
      );
      expect(res.body.name).toBe('Imported OFF');
    },
  );

  itIfDb('PATCH /food-products/:id updates product', async () => {
    const res = await request(app.getHttpServer())
      .patch('/food-products/00000000-0000-0000-0000-000000000201')
      .send({ name: 'Apple Updated', brands: 'Test Brand' })
      .expect(200);
    expect(res.body.name).toBe('Apple Updated');
    expect(res.body.brands).toBe('Test Brand');
  });

  itIfDb('DELETE /food-products/:id deletes product', async () => {
    await request(app.getHttpServer())
      .delete('/food-products/00000000-0000-0000-0000-000000000202')
      .expect(204);

    await request(app.getHttpServer())
      .get('/food-products/00000000-0000-0000-0000-000000000202')
      .expect(404);
  });

  itIfDb(
    'GET /food-products/:id/openfoodfacts returns null when barcode missing',
    async () => {
      const created = await prisma.foodProduct.create({
        data: { name: 'No Barcode', createdBy: authUser.id },
      });

      const res = await request(app.getHttpServer())
        .get(`/food-products/${created.id}/openfoodfacts`)
        .expect(200);
      expect(res.body === null || JSON.stringify(res.body) === '{}').toBe(true);
    },
  );

  itIfDb(
    'GET /food-products/:id/openfoodfacts returns OFF payload when barcode exists',
    async () => {
      openFoodFactsMock.getProductByBarcode.mockResolvedValue({
        barcode: '1111111111111',
        name: 'Apple OFF',
      });

      const res = await request(app.getHttpServer())
        .get('/food-products/00000000-0000-0000-0000-000000000201/openfoodfacts')
        .expect(200);

      expect(openFoodFactsMock.getProductByBarcode).toHaveBeenCalledWith(
        '1111111111111',
      );
      expect(res.body).toEqual(
        expect.objectContaining({ barcode: '1111111111111' }),
      );
    },
  );

  itIfDb('returns 400 for invalid UUID on /food-products/:id', async () => {
    await request(app.getHttpServer()).get('/food-products/not-a-uuid').expect(400);
  });
});
