import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { GenericFoodsController } from '../../src/generic-foods/controllers/generic-foods.controller';
import { GenericFoodRepository } from '../../src/generic-foods/repositories/generic-food.repository';
import { GenericFoodService } from '../../src/generic-foods/services/generic-food.service';
import {
  createAuthGuardMock,
  createControllerE2eTestApp,
  DEFAULT_CATALOG_AUTH_USER,
  seedAuthUser,
  setupCatalogDb,
} from './helpers/food-catalog-e2e-helpers';

describe('GenericFoods endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const authUser = DEFAULT_CATALOG_AUTH_USER;

  async function seedBaseData() {
    await seedAuthUser(prisma, authUser);
    await prisma.genericFood.createMany({
      data: [
        {
          id: '00000000-0000-0000-0000-000000000301',
          nevoVersion: 'NEVO-Online 2025 9.0',
          foodGroup: 'Fruit',
          nevoCode: 900001,
          foodName: 'Apple, raw',
        },
        {
          id: '00000000-0000-0000-0000-000000000302',
          nevoVersion: 'NEVO-Online 2025 9.0',
          foodGroup: 'Vegetables',
          nevoCode: 900002,
          foodName: 'Carrot, raw',
        },
      ],
      skipDuplicates: true,
    });
  }

  beforeAll(async () => {
    const db = await setupCatalogDb();
    prisma = db.prisma;

    const appSetup = await createControllerE2eTestApp({
      controllers: [GenericFoodsController],
      providers: [
        GenericFoodService,
        GenericFoodRepository,
        { provide: PrismaService, useValue: prisma },
      ],
      authGuardMock: createAuthGuardMock(authUser),
    });

    app = appSetup.app;
  });

  beforeEach(async () => {
    await prisma.genericFood.deleteMany();
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

  itIfDb('GET /generic-foods returns paginated list', async () => {
    const res = await request(app.getHttpServer())
      .get('/generic-foods?page=1&limit=10')
      .expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
  });

  itIfDb('GET /generic-foods supports search and foodGroup filters', async () => {
    const res = await request(app.getHttpServer())
      .get('/generic-foods?search=Apple&foodGroup=Fruit')
      .expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].foodName).toContain('Apple');
  });

  itIfDb('GET /generic-foods/food-groups returns group list', async () => {
    const res = await request(app.getHttpServer())
      .get('/generic-foods/food-groups')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(expect.arrayContaining(['Fruit', 'Vegetables']));
  });

  itIfDb('GET /generic-foods/:id returns one generic food', async () => {
    const res = await request(app.getHttpServer())
      .get('/generic-foods/00000000-0000-0000-0000-000000000301')
      .expect(200);
    expect(res.body.nevoCode).toBe(900001);
  });

  itIfDb('POST /generic-foods creates one', async () => {
    const res = await request(app.getHttpServer())
      .post('/generic-foods')
      .send({
        nevoVersion: 'NEVO-Online 2025 9.0',
        foodGroup: 'Nuts',
        nevoCode: 900010,
        foodName: 'Almond, raw',
      })
      .expect(201);
    expect(res.body.foodName).toBe('Almond, raw');
    expect(res.body.nevoCode).toBe(900010);
  });

  itIfDb('PATCH /generic-foods/:id updates one', async () => {
    const res = await request(app.getHttpServer())
      .patch('/generic-foods/00000000-0000-0000-0000-000000000301')
      .send({ foodName: 'Apple, raw updated' })
      .expect(200);
    expect(res.body.foodName).toBe('Apple, raw updated');
  });

  itIfDb('DELETE /generic-foods/:id deletes one', async () => {
    await request(app.getHttpServer())
      .delete('/generic-foods/00000000-0000-0000-0000-000000000302')
      .expect(204);

    await request(app.getHttpServer())
      .get('/generic-foods/00000000-0000-0000-0000-000000000302')
      .expect(404);
  });

  itIfDb('returns 400 for invalid payload on POST /generic-foods', async () => {
    await request(app.getHttpServer())
      .post('/generic-foods')
      .send({ foodGroup: 'Missing required fields' })
      .expect(400);
  });
});
