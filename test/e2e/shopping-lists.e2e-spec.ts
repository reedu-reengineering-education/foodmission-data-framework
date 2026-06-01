import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { DataBaseAuthGuard } from '../../src/common/guards/database-auth.guards';
import { PrismaService } from '../../src/database/prisma.service';
import { FoodProductRepository } from '../../src/food-products/repositories/food-product.repository';
import { GenericFoodRepository } from '../../src/generic-foods/repositories/generic-food.repository';
import { ShoppingListItemsController } from '../../src/shopping-lists/controllers/shopping-list-items.controller';
import { ShoppingListsController } from '../../src/shopping-lists/controllers/shopping-lists.controller';
import { ShoppingListItemRepository } from '../../src/shopping-lists/repositories/shopping-list-items.repository';
import { ShoppingListRepository } from '../../src/shopping-lists/repositories/shopping-lists.repository';
import { ShoppingListItemService } from '../../src/shopping-lists/services/shopping-list-items.service';
import { ShoppingListService } from '../../src/shopping-lists/services/shopping-lists.service';
import { closeTestApp, createTestApp } from './helpers/app-e2e-helpers';
import { createTestPrismaClient } from './helpers/prisma-e2e-helpers';

describe('Shopping Lists (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const authUser = {
    id: '00000000-0000-0000-0000-00000000bb01',
    sub: 'e2e-shopping-user',
    email: 'e2e-shopping-user@test.com',
  };

  beforeAll(async () => {
    prisma = createTestPrismaClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ShoppingListsController, ShoppingListItemsController],
      providers: [
        ShoppingListService,
        ShoppingListRepository,
        ShoppingListItemService,
        ShoppingListItemRepository,
        FoodProductRepository,
        GenericFoodRepository,
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
      },
    });
    await prisma.shoppingListItem.deleteMany({
      where: { shoppingList: { userId: authUser.id } },
    });
    await prisma.shoppingList.deleteMany({ where: { userId: authUser.id } });
    await prisma.foodProduct.upsert({
      where: { id: '00000000-0000-0000-0000-00000000bb11' },
      update: { name: 'Shopping E2E Product' },
      create: {
        id: '00000000-0000-0000-0000-00000000bb11',
        name: 'Shopping E2E Product',
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

  it('shopping lists + items endpoints', async () => {
    const createdList = await request(app.getHttpServer())
      .post('/shopping-lists')
      .send({ title: 'Family-Shopping-List' })
      .expect(201);
    const listId = createdList.body.id;

    await request(app.getHttpServer()).get('/shopping-lists').expect(200);
    await request(app.getHttpServer())
      .get(`/shopping-lists/${listId}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/shopping-lists/${listId}`)
      .send({ title: 'Family-Shopping-List-Updated' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/shopping-lists/${listId}/items`)
      .send({
        foodProductId: '00000000-0000-0000-0000-00000000bb11',
        quantity: 1,
        unit: 'PIECES',
        checked: false,
      })
      .expect(400);

    const item = await prisma.shoppingListItem.create({
      data: {
        shoppingListId: listId,
        foodProductId: '00000000-0000-0000-0000-00000000bb11',
        quantity: 1,
        unit: 'PIECES',
      },
    });
    const itemId = item.id;

    await request(app.getHttpServer())
      .get(`/shopping-lists/${listId}/items`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/shopping-lists/${listId}/items/${itemId}`)
      .send({ quantity: 2, checked: true })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/shopping-lists/${listId}/items/${itemId}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/shopping-lists/${listId}`)
      .expect(200);
  });
});
