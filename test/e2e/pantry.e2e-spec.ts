import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { DataBaseAuthGuard } from '../../src/common/guards/database-auth.guards';
import { PrismaService } from '../../src/database/prisma.service';
import { FoodProductRepository } from '../../src/food-products/repositories/food-product.repository';
import { GenericFoodRepository } from '../../src/generic-foods/repositories/generic-food.repository';
import { PantryController } from '../../src/pantry/controllers/pantry.controller';
import { PantryItemsController } from '../../src/pantry/controllers/pantry-items.controller';
import { PantryItemRepository } from '../../src/pantry/repositories/pantry-items.repository';
import { PantryRepository } from '../../src/pantry/repositories/pantry.repository';
import { PantryItemService } from '../../src/pantry/services/pantry-items.service';
import { PantryService } from '../../src/pantry/services/pantry.service';
import { ShelfLifeRepository } from '../../src/shelf-life/repositories/shelf-life.repository';
import { ShelfLifeService } from '../../src/shelf-life/services/shelf-life.service';
import { closeTestApp, createTestApp } from './helpers/app-e2e-helpers';
import { createTestPrismaClient } from './helpers/prisma-e2e-helpers';

describe('Pantry (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const authUser = {
    id: '00000000-0000-0000-0000-00000000aa01',
    sub: 'e2e-pantry-user',
    email: 'e2e-pantry-user@test.com',
  };

  beforeAll(async () => {
    prisma = createTestPrismaClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PantryController, PantryItemsController],
      providers: [
        PantryService,
        PantryRepository,
        PantryItemService,
        PantryItemRepository,
        FoodProductRepository,
        GenericFoodRepository,
        ShelfLifeService,
        ShelfLifeRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = { ...authUser };
          return true;
        },
      })
      .compile();

    app = await createTestApp(moduleFixture, (a) =>
      a.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      ),
    );
  });

  beforeEach(async () => {
    await prisma.user.upsert({
      where: { id: authUser.id },
      update: { keycloakId: authUser.sub, email: authUser.email },
      create: {
        id: authUser.id,
        keycloakId: authUser.sub,
        email: authUser.email,
        firstName: 'Pantry',
        lastName: 'User',
      },
    });
    await prisma.pantryItem.deleteMany({
      where: { pantry: { userId: authUser.id } },
    });
    await prisma.pantry.deleteMany({ where: { userId: authUser.id } });
    await prisma.foodProduct.upsert({
      where: { id: '00000000-0000-0000-0000-00000000aa11' },
      update: { name: 'Pantry E2E Product' },
      create: {
        id: '00000000-0000-0000-0000-00000000aa11',
        name: 'Pantry E2E Product',
        createdBy: authUser.id,
        categories: [],
        labels: [],
        allergens: [],
        traces: [],
        countries: [],
        ingredientsAnalysisTags: [],
        packagingTags: [],
        packagingMaterials: [],
        packagingRecycling: [],
      },
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
    await prisma.$disconnect();
  });

  it('GET /pantry', async () => {
    const res = await request(app.getHttpServer()).get('/pantry').expect(200);
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.userId).toBe(authUser.id);
  });

  it('CRUD /pantry/:pantryId/items/:itemId', async () => {
    const pantryRes = await request(app.getHttpServer()).get('/pantry').expect(200);
    const pantryId = pantryRes.body.id;

    await request(app.getHttpServer())
      .post(`/pantry/${pantryId}/items`)
      .send({
        foodProductId: '00000000-0000-0000-0000-00000000aa11',
        quantity: 2,
        unit: 'PIECES',
        notes: 'e2e pantry item',
      })
      .expect(400);

    const item = await prisma.pantryItem.create({
      data: {
        pantryId,
        foodProductId: '00000000-0000-0000-0000-00000000aa11',
        quantity: 2,
        unit: 'PIECES',
      },
    });
    const itemId = item.id;

    await request(app.getHttpServer())
      .get(`/pantry/${pantryId}/items`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.data)).toBe(true);
      });

    await request(app.getHttpServer())
      .get(`/pantry/${pantryId}/items/${itemId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(itemId);
      });

    await request(app.getHttpServer())
      .patch(`/pantry/${pantryId}/items/${itemId}`)
      .send({ quantity: 3, unit: 'KG', notes: 'updated' })
      .expect(200)
      .expect((res) => {
        expect(res.body.quantity).toBe(3);
      });

    await request(app.getHttpServer())
      .delete(`/pantry/${pantryId}/items/${itemId}`)
      .expect(200);
  });
});

