import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { GenericFoodsController } from '../../src/generic-foods/controllers/generic-foods.controller';
import { GenericFoodRepository } from '../../src/generic-foods/repositories/generic-food.repository';
import { GenericFoodService } from '../../src/generic-foods/services/generic-food.service';
import { Foodex2FoodService } from '../../src/generic-foods/services/foodex2-food.service';
import { Foodex2Repository } from '../../src/generic-foods/repositories/foodex2.repository';
import { TranslationService } from '../../src/translations/services/translation.service';
import { FOODEX2_CANONICAL_CONFIG } from '../../src/generic-foods/foodex2/foodex2-canonical.config';
import {
  createAuthGuardMock,
  createControllerE2eTestApp,
  DEFAULT_CATALOG_AUTH_USER,
  seedAuthUser,
  setupCatalogDb,
} from './helpers/controller-e2e-helpers';

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
        // Three NEVO pasta variants behind a single FoodEx2 concept.
        {
          id: '00000000-0000-0000-0000-000000000303',
          nevoVersion: 'NEVO-Online 2025 9.0',
          foodGroup: 'Cereals',
          nevoCode: 900004,
          foodName: 'Pasta white raw',
          foodex2Codes: ['A907P'],
          energyKcal: 361,
          water: 10.4,
          proteins: 12.5,
        },
        {
          id: '00000000-0000-0000-0000-000000000304',
          nevoVersion: 'NEVO-Online 2025 9.0',
          foodGroup: 'Cereals',
          nevoCode: 900005,
          foodName: 'Pasta white wo egg boiled',
          foodex2Codes: ['A907P'],
          energyKcal: 146,
          water: 63.6,
          proteins: 5.1,
        },
        {
          id: '00000000-0000-0000-0000-000000000305',
          nevoVersion: 'NEVO-Online 2025 9.0',
          foodGroup: 'Cereals',
          nevoCode: 900006,
          foodName: 'Pasta wholemeal raw',
          foodex2Codes: ['A907Q'],
          energyKcal: 340,
          water: 11.2,
          proteins: 13.4,
        },
        // Two NEVO records behind a *composite* concept: a dish is named after
        // its recipe, so the second one mentions an ingredient it is not.
        {
          id: '00000000-0000-0000-0000-000000000306',
          nevoVersion: 'NEVO-Online 2025 9.0',
          foodGroup: 'Egg dishes',
          nevoCode: 900007,
          foodName: 'Omelette scrambled eggs',
          foodex2Codes: ['A908D'],
        },
        {
          id: '00000000-0000-0000-0000-000000000307',
          nevoVersion: 'NEVO-Online 2025 9.0',
          foodGroup: 'Egg dishes',
          nevoCode: 900008,
          foodName: 'Omelette w potatoes Spanish tortilla',
          foodex2Codes: ['A908D'],
        },
      ],
      skipDuplicates: true,
    });

    await seedFoodex2Fixtures();
  }

  /**
   * A miniature FoodEx2 tree: one hierarchy term, one core concept and the two
   * extended terms the NEVO records above actually point at.
   */
  async function seedFoodex2Fixtures() {
    await prisma.foodex2Term.createMany({
      data: [
        {
          code: 'A907G',
          name: 'Pasta',
          nameEn: 'Pasta',
          detailLevel: 'H',
          termType: 's',
          isCore: false,
          mtxVersion: 'test',
        },
        {
          code: 'A907L',
          name: 'Dried pasta',
          nameEn: 'Dried pasta',
          detailLevel: 'C',
          termType: 's',
          isCore: true,
          parentCode: 'A907G',
          mtxVersion: 'test',
        },
        {
          code: 'A907P',
          name: 'Dried durum pasta',
          nameEn: 'Dried durum pasta',
          detailLevel: 'E',
          termType: 's',
          isCore: false,
          parentCode: 'A907L',
          mtxVersion: 'test',
        },
        {
          code: 'A907Q',
          name: 'Dried wholemeal pasta',
          nameEn: 'Dried wholemeal pasta',
          detailLevel: 'E',
          termType: 's',
          isCore: false,
          parentCode: 'A907L',
          mtxVersion: 'test',
        },
        // The composite (recipe-based) branch: concepts under it name dishes.
        {
          code: FOODEX2_CANONICAL_CONFIG.compositeFoodRootCode,
          name: 'Composite food classes',
          nameEn: 'Composite food classes',
          detailLevel: 'H',
          termType: 's',
          isCore: false,
          mtxVersion: 'test',
        },
        {
          code: 'A908D',
          name: 'Egg based dishes',
          nameEn: 'Egg based dishes',
          detailLevel: 'C',
          termType: 's',
          isCore: true,
          parentCode: FOODEX2_CANONICAL_CONFIG.compositeFoodRootCode,
          mtxVersion: 'test',
        },
        // A concept with no NEVO mapping at all — must stay out of search.
        {
          code: 'A907Z',
          name: 'Pasta sauce',
          nameEn: 'Pasta sauce',
          detailLevel: 'C',
          termType: 's',
          isCore: true,
          parentCode: 'A907G',
          mtxVersion: 'test',
        },
      ],
      skipDuplicates: true,
    });

    await prisma.foodex2NevoMapping.createMany({
      data: [
        {
          foodex2Code: 'A907L',
          nevoCode: 900004,
          sourceFoodex2Code: 'A907P',
          hierarchyDepth: 1,
          isCanonical: true,
          priority: 155,
        },
        {
          foodex2Code: 'A907L',
          nevoCode: 900005,
          sourceFoodex2Code: 'A907P',
          hierarchyDepth: 1,
          isCanonical: false,
          priority: 25,
        },
        {
          foodex2Code: 'A907L',
          nevoCode: 900006,
          sourceFoodex2Code: 'A907Q',
          hierarchyDepth: 1,
          isCanonical: false,
          priority: 130,
        },
        {
          foodex2Code: 'A908D',
          nevoCode: 900007,
          sourceFoodex2Code: 'A908D',
          hierarchyDepth: 0,
          isCanonical: true,
          priority: 120,
        },
        {
          foodex2Code: 'A908D',
          nevoCode: 900008,
          sourceFoodex2Code: 'A908D',
          hierarchyDepth: 0,
          isCanonical: false,
          priority: 60,
        },
      ],
      skipDuplicates: true,
    });
  }

  beforeAll(async () => {
    const db = setupCatalogDb();
    prisma = db.prisma;

    const appSetup = await createControllerE2eTestApp({
      controllers: [GenericFoodsController],
      providers: [
        GenericFoodService,
        GenericFoodRepository,
        Foodex2FoodService,
        Foodex2Repository,
        TranslationService,
        { provide: PrismaService, useValue: prisma },
      ],
      authGuardMock: createAuthGuardMock(authUser),
    });

    app = appSetup.app;
  });

  beforeEach(async () => {
    await prisma.entityTranslation.deleteMany();
    await prisma.foodex2NevoMapping.deleteMany();
    await prisma.foodex2Term.deleteMany();
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

  itIfDb(
    'GET /generic-foods supports search and foodGroup filters',
    async () => {
      const res = await request(app.getHttpServer())
        .get('/generic-foods?search=Apple&foodGroup=Fruit')
        .expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].foodName).toContain('Apple');
    },
  );

  itIfDb('GET /generic-foods supports paginated search', async () => {
    const res = await request(app.getHttpServer())
      .get('/generic-foods?search=milk&page=1&limit=20')
      .expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(String(res.body.page)).toBe('1');
    expect(String(res.body.limit)).toBe('20');
  });

  itIfDb('GET /generic-foods/food-groups returns group list', async () => {
    const res = await request(app.getHttpServer())
      .get('/generic-foods/food-groups')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(
      expect.arrayContaining([
        { slug: 'fruit', name: 'Fruit' },
        { slug: 'vegetables', name: 'Vegetables' },
      ]),
    );
  });

  itIfDb('GET /generic-foods/:id returns one generic food', async () => {
    const res = await request(app.getHttpServer())
      .get('/generic-foods/00000000-0000-0000-0000-000000000301')
      .expect(200);
    expect(res.body.nevoCode).toBe(900001);
    expect(res.body.foodGroupSlug).toBe('fruit');
  });

  itIfDb('GET /generic-foods?lang=nl overlays Dutch translations', async () => {
    await prisma.entityTranslation.createMany({
      data: [
        {
          entityType: 'GenericFood',
          entityId: '00000000-0000-0000-0000-000000000301',
          locale: 'nl',
          field: 'foodName',
          value: 'Appel rauw',
        },
        {
          entityType: 'GenericFood',
          entityId: '00000000-0000-0000-0000-000000000301',
          locale: 'nl',
          field: 'foodGroup',
          value: 'Fruit (NL)',
        },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/generic-foods/00000000-0000-0000-0000-000000000301?lang=nl')
      .expect(200);

    expect(res.body.foodName).toBe('Appel rauw');
    expect(res.body.foodGroup).toBe('Fruit (NL)');
    expect(res.body.foodGroupSlug).toBe('fruit');
  });

  itIfDb('GET /generic-foods search works with localized names', async () => {
    await prisma.entityTranslation.create({
      data: {
        entityType: 'GenericFood',
        entityId: '00000000-0000-0000-0000-000000000301',
        locale: 'nl',
        field: 'foodName',
        value: 'Appel rauw',
      },
    });

    const res = await request(app.getHttpServer())
      .get('/generic-foods?lang=nl&search=Appel')
      .expect(200);

    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0].foodName).toBe('Appel rauw');
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

  itIfDb(
    'GET /generic-foods/search returns the FoodEx2 food, not each NEVO variant',
    async () => {
      const res = await request(app.getHttpServer())
        .get('/generic-foods/search?search=pasta')
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].foodName).toBe('Dried pasta');
      expect(res.body.items[0].foodex2Code).toBe('A907L');
      expect(res.body.items[0].variantCount).toBe(3);
    },
  );

  itIfDb('GET /generic-foods/search is case-insensitive', async () => {
    const [lower, upper, partial] = await Promise.all([
      request(app.getHttpServer()).get('/generic-foods/search?search=pasta'),
      request(app.getHttpServer()).get('/generic-foods/search?search=Pasta'),
      request(app.getHttpServer()).get('/generic-foods/search?search=past'),
    ]);

    for (const res of [lower, upper, partial]) {
      expect(res.status).toBe(200);
      expect(
        res.body.items.map((i: { foodName: string }) => i.foodName),
      ).toEqual(['Dried pasta']);
    }
  });

  itIfDb(
    'GET /generic-foods/search returns the canonical NEVO nutrients, not an average',
    async () => {
      const res = await request(app.getHttpServer())
        .get('/generic-foods/search?search=pasta')
        .expect(200);

      const [food] = res.body.items;
      // The dry record, verbatim — not the mean of dry (361) and boiled (146).
      expect(food.energyKcal).toBe(361);
      expect(food.water).toBe(10.4);
      expect(food.source.nevoCode).toBe(900004);
      expect(food.source.foodName).toBe('Pasta white raw');
    },
  );

  itIfDb(
    'GET /generic-foods/search hides FoodEx2 foods with no canonical NEVO item',
    async () => {
      const res = await request(app.getHttpServer())
        .get('/generic-foods/search?search=sauce')
        .expect(200);

      expect(res.body.items).toEqual([]);
    },
  );

  itIfDb(
    'GET /generic-foods/search ranks exact matches above partial ones',
    async () => {
      const res = await request(app.getHttpServer())
        .get('/generic-foods/search?search=dried pasta')
        .expect(200);

      expect(res.body.items[0].foodName).toBe('Dried pasta');
    },
  );

  itIfDb('GET /generic-foods/foodex2/:code resolves one food', async () => {
    const res = await request(app.getHttpServer())
      .get('/generic-foods/foodex2/A907L')
      .expect(200);

    expect(res.body.foodName).toBe('Dried pasta');
    expect(res.body.isCore).toBe(true);
    // The canonical GenericFood id keeps existing NEVO-based logic working.
    expect(res.body.source.genericFoodId).toBe(
      '00000000-0000-0000-0000-000000000303',
    );
  });

  itIfDb(
    'GET /generic-foods/search returns a superset of the generic-food shape',
    async () => {
      const [legacy, foodex2] = await Promise.all([
        request(app.getHttpServer()).get(
          '/generic-foods/00000000-0000-0000-0000-000000000303',
        ),
        request(app.getHttpServer()).get('/generic-foods/search?search=pasta'),
      ]);

      const before = legacy.body;
      const after = foodex2.body.items[0];

      // Every key the legacy endpoint returns is still present, so a client can
      // switch endpoints without changing how it reads a result.
      for (const key of Object.keys(before)) {
        expect(after).toHaveProperty(key);
      }
      // Same record, same id — only the user-facing name differs.
      expect(after.id).toBe(before.id);
      expect(after.nevoCode).toBe(before.nevoCode);
      expect(after.energyKcal).toBe(before.energyKcal);
      expect(after.foodGroupSlug).toBe(before.foodGroupSlug);
      expect(before.foodName).toBe('Pasta white raw');
      expect(after.foodName).toBe('Dried pasta');
    },
  );

  itIfDb('search results can be used directly as genericFoodId', async () => {
    const res = await request(app.getHttpServer())
      .get('/generic-foods/search?search=pasta')
      .expect(200);

    // The trap this shape exists to avoid: `id` must be the GenericFood id,
    // never the FoodEx2 term id, or every add-to-pantry call would 400.
    const food = res.body.items[0];
    expect(food.id).not.toBe(food.foodex2Id);
    await expect(
      prisma.genericFood.findUnique({ where: { id: food.id } }),
    ).resolves.toMatchObject({ nevoCode: 900004 });
  });

  itIfDb(
    'GET /generic-foods/foodex2/:code 404s for a code with no canonical NEVO item',
    async () => {
      await request(app.getHttpServer())
        .get('/generic-foods/foodex2/A907Z')
        .expect(404);
    },
  );

  itIfDb(
    'rejects a second canonical NEVO item for one FoodEx2 food',
    async () => {
      // The partial unique index is what guarantees "zero or one canonical".
      await expect(
        prisma.foodex2NevoMapping.update({
          where: {
            foodex2Code_nevoCode: { foodex2Code: 'A907L', nevoCode: 900005 },
          },
          data: { isCanonical: true },
        }),
      ).rejects.toThrow();
    },
  );

  itIfDb('GET /generic-foods still lists the raw NEVO records', async () => {
    const res = await request(app.getHttpServer())
      .get('/generic-foods?search=Pasta')
      .expect(200);

    // Backwards compatible: the legacy listing is untouched and still returns
    // every NEVO variant.
    expect(res.body.items.length).toBe(3);
  });

  itIfDb(
    'GET /generic-foods/search?lang=de finds pasta by its German NEVO name',
    async () => {
      // The concept name is still English; the NEVO variant is translated.
      await prisma.entityTranslation.create({
        data: {
          entityType: 'GenericFood',
          entityId: '00000000-0000-0000-0000-000000000303',
          locale: 'de',
          field: 'foodName',
          value: 'Weiße Nudeln, roh',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/generic-foods/search?search=Nudeln&lang=de')
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].foodex2Code).toBe('A907L');
      expect(res.body.items[0].energyKcal).toBe(361);
    },
  );

  itIfDb(
    'GET /generic-foods/search?lang=de returns the German concept name',
    async () => {
      await prisma.entityTranslation.create({
        data: {
          entityType: 'Foodex2Term',
          entityId: (
            await prisma.foodex2Term.findUniqueOrThrow({
              where: { code: 'A907L' },
              select: { id: true },
            })
          ).id,
          locale: 'de',
          field: 'name',
          value: 'Getrocknete Nudeln',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/generic-foods/search?search=Getrocknete&lang=de')
        .expect(200);

      expect(res.body.items[0].foodName).toBe('Getrocknete Nudeln');
      expect(res.body.items[0].nameEn).toBe('Dried pasta');
    },
  );

  itIfDb(
    'finds a plain concept by a translated name in any locale',
    async () => {
      // A user typing German without ?lang should still find the food.
      await prisma.entityTranslation.create({
        data: {
          entityType: 'GenericFood',
          entityId: '00000000-0000-0000-0000-000000000303',
          locale: 'de',
          field: 'foodName',
          value: 'Weiße Nudeln, roh',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/generic-foods/search?search=Nudeln')
        .expect(200);

      expect(
        res.body.items.map((item: { foodex2Code: string }) => item.foodex2Code),
      ).toEqual(['A907L']);
    },
  );

  itIfDb('holds a composite concept to the requested locale', async () => {
    // Word order differs per language, and the head rule below relies on it.
    await prisma.entityTranslation.create({
      data: {
        entityType: 'GenericFood',
        entityId: '00000000-0000-0000-0000-000000000307',
        locale: 'de',
        field: 'foodName',
        value: 'Kartoffelomelett, spanische Tortilla',
      },
    });

    const german = await request(app.getHttpServer())
      .get('/generic-foods/search?search=Kartoffelomelett&lang=de')
      .expect(200);
    expect(
      german.body.items.map(
        (item: { foodex2Code: string }) => item.foodex2Code,
      ),
    ).toEqual(['A908D']);

    const english = await request(app.getHttpServer())
      .get('/generic-foods/search?search=Kartoffelomelett')
      .expect(200);
    expect(english.body.items).toEqual([]);
  });

  itIfDb(
    'never answers a composite concept with an ingredient it mentions',
    async () => {
      // "Omelett mit Kartoffeln" is filed under egg dishes; it is not a potato.
      await prisma.entityTranslation.create({
        data: {
          entityType: 'GenericFood',
          entityId: '00000000-0000-0000-0000-000000000307',
          locale: 'de',
          field: 'foodName',
          value: 'Omelett mit Kartoffeln, spanische Tortilla',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/generic-foods/search?search=Kartoffeln&lang=de')
        .expect(200);

      expect(res.body.items).toEqual([]);
    },
  );

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
