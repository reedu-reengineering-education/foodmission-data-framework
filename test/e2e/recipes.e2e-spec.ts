import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { RecipeController } from '../../src/recipes/controllers/recipes.controller';
import { RecipesRepository } from '../../src/recipes/repositories/recipes.repository';
import { RecipesService } from '../../src/recipes/services/recipes.service';
import {
  createAuthGuardMock,
  createControllerE2eTestApp,
  DEFAULT_CATALOG_AUTH_USER,
  seedAuthUser,
  setupCatalogDb,
} from './helpers/controller-e2e-helpers';

describe('Recipes endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const authUser = DEFAULT_CATALOG_AUTH_USER;

  beforeAll(async () => {
    const db = setupCatalogDb();
    prisma = db.prisma;

    const appSetup = await createControllerE2eTestApp({
      controllers: [RecipeController],
      providers: [
        RecipesService,
        RecipesRepository,
        { provide: PrismaService, useValue: prisma },
      ],
      authGuardMock: createAuthGuardMock(authUser),
    });

    app = appSetup.app;
  });

  beforeEach(async () => {
    await seedAuthUser(prisma, authUser);
    await prisma.recipe.deleteMany({ where: { userId: authUser.id } });
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it('POST /recipes creates a recipe', async () => {
    const res = await request(app.getHttpServer())
      .post('/recipes')
      .send({ title: 'Hearty Veggie Pasta' })
      .expect(201);

    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.title).toBe('Hearty Veggie Pasta');
    expect(res.body.userId).toBe(authUser.id);
  });

  it('GET /recipes returns paginated recipes', async () => {
    await prisma.recipe.create({
      data: { title: 'Recipe A', userId: authUser.id, isPublic: false },
    });

    const res = await request(app.getHttpServer())
      .get('/recipes?page=1&limit=10')
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(String(res.body.page)).toBe('1');
    expect(String(res.body.limit)).toBe('10');
  });

  it('GET /recipes/:id returns a recipe', async () => {
    const created = await prisma.recipe.create({
      data: { title: 'Recipe B', userId: authUser.id, isPublic: false },
    });

    const res = await request(app.getHttpServer())
      .get(`/recipes/${created.id}`)
      .expect(200);

    expect(res.body.id).toBe(created.id);
    expect(res.body.title).toBe('Recipe B');
  });

  it('GET /recipes/me returns current user recipes', async () => {
    await prisma.recipe.createMany({
      data: [
        { title: 'Mine 1', userId: authUser.id, isPublic: false },
        { title: 'Mine 2', userId: authUser.id, isPublic: false },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/recipes/me?page=1&limit=10')
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.every((r: any) => r.userId === authUser.id)).toBe(
      true,
    );
  });

  it('PATCH /recipes/:id updates a recipe', async () => {
    const created = await prisma.recipe.create({
      data: { title: 'Old Title', userId: authUser.id, isPublic: false },
    });

    const res = await request(app.getHttpServer())
      .patch(`/recipes/${created.id}`)
      .send({ title: 'Updated Title' })
      .expect(200);

    expect(res.body.id).toBe(created.id);
    expect(res.body.title).toBe('Updated Title');
  });

  it('DELETE /recipes/:id deletes a recipe', async () => {
    const created = await prisma.recipe.create({
      data: { title: 'To Delete', userId: authUser.id, isPublic: false },
    });

    await request(app.getHttpServer())
      .delete(`/recipes/${created.id}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/recipes/${created.id}`)
      .expect(404);
  });
});
