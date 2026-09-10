import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { GenericFoodsController } from '../../src/generic-foods/controllers/generic-foods.controller';
import { GenericFoodRepository } from '../../src/generic-foods/repositories/generic-food.repository';
import { GenericFoodService } from '../../src/generic-foods/services/generic-food.service';
import { FoodSearchRepository } from '../../src/generic-foods/repositories/food-search.repository';
import { TranslationService } from '../../src/translations/services/translation.service';
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
        // Two NEVO records filed directly under a dish category; the second
        // one mentions an ingredient it is not.
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
        // A dish category whose canonical record is not a lasagne.
        {
          id: '00000000-0000-0000-0000-000000000308',
          nevoVersion: 'NEVO-Online 2025 9.0',
          foodGroup: 'Mixed dishes',
          nevoCode: 900011,
          foodName: 'Lasagna bolognese ready to eat',
          foodex2Codes: ['A909P'],
          energyKcal: 150,
        },
        {
          id: '00000000-0000-0000-0000-000000000309',
          nevoVersion: 'NEVO-Online 2025 9.0',
          foodGroup: 'Mixed dishes',
          nevoCode: 900012,
          foodName: 'Chinese noodle dish Bami goreng wo egg',
          foodex2Codes: ['A909C'],
          energyKcal: 180,
        },
      ],
      skipDuplicates: true,
    });

    await seedFoodex2Fixtures();
  }

  /**
   * A miniature FoodEx2 tree: a plain concept (*Dried pasta*) with two
   * extended terms, and two dish categories (MTX term type `c`).
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
        {
          code: 'A908D',
          name: 'Egg based dishes',
          nameEn: 'Egg based dishes',
          detailLevel: 'C',
          termType: 'c',
          isCore: true,
          mtxVersion: 'test',
        },
        {
          code: 'A909C',
          name: 'Pasta based dishes, cooked',
          nameEn: 'Pasta based dishes, cooked',
          detailLevel: 'C',
          termType: 'c',
          isCore: true,
          mtxVersion: 'test',
        },
        {
          code: 'A909P',
          name: 'Lasagna',
          nameEn: 'Lasagna',
          detailLevel: 'E',
          termType: 'c',
          isCore: false,
          parentCode: 'A909C',
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
        {
          foodex2Code: 'A909C',
          nevoCode: 900011,
          sourceFoodex2Code: 'A909P',
          hierarchyDepth: 1,
          isCanonical: false,
          priority: 50,
        },
        {
          foodex2Code: 'A909C',
          nevoCode: 900012,
          sourceFoodex2Code: 'A909C',
          hierarchyDepth: 0,
          isCanonical: true,
          priority: 70,
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
        FoodSearchRepository,
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
    'search collapses the variants of a FoodEx2 food the query names',
    async () => {
      const res = await request(app.getHttpServer())
        .get('/generic-foods?search=pasta')
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.items[0]).toMatchObject({
        foodName: 'Dried pasta',
        nevoFoodName: 'Pasta white raw',
        isConcept: true,
        foodex2Code: 'A907L',
        variantCount: 3,
      });
    },
  );

  itIfDb('search is case-insensitive and matches partial words', async () => {
    const [lower, upper, partial] = await Promise.all([
      request(app.getHttpServer()).get('/generic-foods?search=pasta'),
      request(app.getHttpServer()).get('/generic-foods?search=Pasta'),
      request(app.getHttpServer()).get('/generic-foods?search=past'),
    ]);

    for (const res of [lower, upper, partial]) {
      expect(res.status).toBe(200);
      expect(
        res.body.items.map((i: { foodName: string }) => i.foodName),
      ).toEqual(['Dried pasta']);
    }
  });

  itIfDb(
    'a collapsed row carries the canonical NEVO record, verbatim',
    async () => {
      const res = await request(app.getHttpServer())
        .get('/generic-foods?search=dried pasta')
        .expect(200);

      const [food] = res.body.items;
      // The dry record — not the mean of dry (361) and boiled (146).
      expect(food.energyKcal).toBe(361);
      expect(food.water).toBe(10.4);
      expect(food.nevoCode).toBe(900004);
      // `id` is a real GenericFood id, valid as `genericFoodId`.
      await expect(
        prisma.genericFood.findUnique({ where: { id: food.id } }),
      ).resolves.toMatchObject({ nevoCode: 900004 });
    },
  );

  itIfDb(
    'search returns the record a query names, not its category canonical',
    async () => {
      const res = await request(app.getHttpServer())
        .get('/generic-foods?search=lasagna')
        .expect(200);

      // "Pasta based dishes" is represented by bami goreng; a lasagne search
      // must never land there.
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        foodName: 'Lasagna bolognese ready to eat',
        nevoCode: 900011,
        energyKcal: 150,
        isConcept: false,
        // A dish never folds, so the row stands for this record alone.
        foodex2Code: null,
        variantCount: 1,
      });
    },
  );

  itIfDb('search never collapses a dish category', async () => {
    const res = await request(app.getHttpServer())
      .get('/generic-foods?search=omelette')
      .expect(200);

    expect(
      res.body.items.map((i: { foodName: string; isConcept: boolean }) => [
        i.foodName,
        i.isConcept,
      ]),
    ).toEqual([
      // Both lead with the query; the plainer record comes first.
      ['Omelette scrambled eggs', false],
      ['Omelette w potatoes Spanish tortilla', false],
    ]);
  });

  itIfDb(
    'search ranks an ingredient mention below the food itself',
    async () => {
      await prisma.genericFood.create({
        data: {
          nevoVersion: 'NEVO-Online 2025 9.0',
          foodGroup: 'Potatoes and tubers',
          nevoCode: 900013,
          foodName: 'Potatoes raw',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/generic-foods?search=potatoes')
        .expect(200);

      expect(
        res.body.items.map((i: { foodName: string }) => i.foodName),
      ).toEqual(['Potatoes raw', 'Omelette w potatoes Spanish tortilla']);
    },
  );

  itIfDb('foodex2Code lists every record behind a row', async () => {
    const res = await request(app.getHttpServer())
      .get('/generic-foods?foodex2Code=a907l')
      .expect(200);

    // Uncollapsed, and the most generic record first.
    expect(res.body.total).toBe(3);
    expect(res.body.items.map((i: { nevoCode: number }) => i.nevoCode)).toEqual(
      [900004, 900006, 900005],
    );
    expect(
      res.body.items.every((i: { isConcept: boolean }) => !i.isConcept),
    ).toBe(true);
  });

  itIfDb('rejects a malformed foodex2Code', async () => {
    await request(app.getHttpServer())
      .get('/generic-foods?foodex2Code=A907L%25')
      .expect(400);
  });

  itIfDb('search hides FoodEx2 foods with no canonical NEVO item', async () => {
    const res = await request(app.getHttpServer())
      .get('/generic-foods?search=sauce')
      .expect(200);

    expect(res.body.items).toEqual([]);
  });

  itIfDb('search result is a superset of the generic-food shape', async () => {
    const [single, search] = await Promise.all([
      request(app.getHttpServer()).get(
        '/generic-foods/00000000-0000-0000-0000-000000000303',
      ),
      request(app.getHttpServer()).get('/generic-foods?search=dried pasta'),
    ]);

    const before = single.body;
    const after = search.body.items[0];

    for (const key of Object.keys(before)) {
      expect(after).toHaveProperty(key);
    }
    // Same record, same id — only the user-facing name differs.
    expect(after.id).toBe(before.id);
    expect(after.energyKcal).toBe(before.energyKcal);
    expect(after.foodGroupSlug).toBe(before.foodGroupSlug);
    expect(before.foodName).toBe('Pasta white raw');
    expect(after.foodName).toBe('Dried pasta');
  });

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

  itIfDb(
    'GET /generic-foods without search lists raw NEVO records',
    async () => {
      const res = await request(app.getHttpServer())
        .get('/generic-foods?foodGroup=Cereals')
        .expect(200);

      expect(res.body.items).toHaveLength(3);
      expect(res.body.items[0]).not.toHaveProperty('isConcept');
    },
  );

  itIfDb('search?lang=de finds a record by its German name', async () => {
    // No German concept name yet, so "Nudeln" names no FoodEx2 food and the
    // matching record answers — folded with its sibling variant.
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
      .get('/generic-foods?search=Nudeln&lang=de')
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      foodName: 'Weiße Nudeln, roh',
      isConcept: false,
      foodex2Code: 'A907P',
      variantCount: 2,
      energyKcal: 361,
    });
  });

  describe('with a German concept name', () => {
    beforeEach(async () => {
      const term = await prisma.foodex2Term.findUniqueOrThrow({
        where: { code: 'A907L' },
        select: { id: true },
      });
      await prisma.entityTranslation.create({
        data: {
          entityType: 'Foodex2Term',
          entityId: term.id,
          locale: 'de',
          field: 'name',
          value: 'Getrocknete Nudeln',
        },
      });
    });

    itIfDb('collapses into the concept the German query names', async () => {
      const res = await request(app.getHttpServer())
        .get('/generic-foods?search=Nudeln&lang=de')
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        foodName: 'Getrocknete Nudeln',
        isConcept: true,
        foodex2Code: 'A907L',
      });
    });

    itIfDb('still finds the concept by its English name', async () => {
      const res = await request(app.getHttpServer())
        .get('/generic-foods?search=pasta&lang=de')
        .expect(200);

      expect(res.body.items[0]).toMatchObject({
        foodName: 'Getrocknete Nudeln',
        isConcept: true,
      });
    });
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
