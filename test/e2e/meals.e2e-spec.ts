import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { MealsController } from '../../src/meals/controllers/meals.controller';
import { MealsRepository } from '../../src/meals/repositories/meals.repository';
import { MealsService } from '../../src/meals/services/meals.service';
import {
  createAuthGuardMock,
  createControllerE2eTestApp,
  DEFAULT_CATALOG_AUTH_USER,
  seedAuthUser,
  setupCatalogDb,
} from './helpers/controller-e2e-helpers';

describe('Meals endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const authUser = DEFAULT_CATALOG_AUTH_USER;

  beforeAll(async () => {
    const db = setupCatalogDb();
    prisma = db.prisma;

    const appSetup = await createControllerE2eTestApp({
      controllers: [MealsController],
      providers: [
        MealsService,
        MealsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
      authGuardMock: createAuthGuardMock(authUser),
    });

    app = appSetup.app;
  });

  beforeEach(async () => {
    await seedAuthUser(prisma, authUser);
    await prisma.meal.deleteMany({ where: { userId: authUser.id } });
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it('GET /meals returns paginated list', async () => {
    const res = await request(app.getHttpServer())
      .get('/meals?page=1&limit=10')
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(0);
  });

  it('POST /meals creates a meal', async () => {
    const res = await request(app.getHttpServer())
      .post('/meals')
      .send({ name: 'Grilled Salad' })
      .expect(201);

    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.name).toBe('Grilled Salad');
    expect(res.body.userId).toBe(authUser.id);
  });

  it('GET /meals/:id returns a meal', async () => {
    const created = await prisma.meal.create({
      data: { name: 'Test Meal', userId: authUser.id },
    });

    const res = await request(app.getHttpServer())
      .get(`/meals/${created.id}`)
      .expect(200);

    expect(res.body.id).toBe(created.id);
    expect(res.body.name).toBe('Test Meal');
  });

  it('PATCH /meals/:id updates mealCourse', async () => {
    const created = await prisma.meal.create({
      data: { name: 'Test Meal', userId: authUser.id },
    });

    const res = await request(app.getHttpServer())
      .patch(`/meals/${created.id}`)
      .send({ mealCourse: 'MAIN_DISH' })
      .expect(200);

    expect(res.body.id).toBe(created.id);
    expect(res.body.mealCourse).toBe('MAIN_DISH');
  });

  it('DELETE /meals/:id deletes meal', async () => {
    const created = await prisma.meal.create({
      data: { name: 'Test Meal', userId: authUser.id },
    });

    await request(app.getHttpServer())
      .delete(`/meals/${created.id}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/meals/${created.id}`)
      .expect(404);
  });
});

