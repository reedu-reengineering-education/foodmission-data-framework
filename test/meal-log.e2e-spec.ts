import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient, TypeOfMeal } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { LoggingService } from '../src/common/logging/logging.service';

describe('MealLog API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let mealId: string;
  let secondMealId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(
        new PrismaClient({
          datasources: {
            db: {
              url:
                process.env.TEST_DATABASE_URL ||
                'postgresql://postgres:password@localhost:5432/foodmission_test_db',
            },
          },
        }),
      )
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes and filters
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const loggingService = app.get(LoggingService);
    app.useGlobalFilters(new GlobalExceptionFilter(loggingService));

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean up database
    await prisma.mealLog.deleteMany();
    await prisma.meal.deleteMany();
    await prisma.food.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'meallog-test@example.com',
        firstName: 'MealLog',
        lastName: 'Tester',
        keycloakId: 'test-keycloak-id-meallog',
      },
    });
    userId = user.id;

    // Mock auth token (in real scenario, this would come from Keycloak)
    authToken = 'mock-jwt-token-for-testing';

    // Create test food
    const food = await prisma.food.create({
      data: {
        name: 'Test Oatmeal',
        description: 'Healthy breakfast oatmeal',
        createdBy: userId,
      },
    });

    // Create test meals
    const meal = await prisma.meal.create({
      data: {
        name: 'Morning Oatmeal',
        userId,
        mealType: 'SALAD',
      },
    });
    mealId = meal.id;

    const secondMeal = await prisma.meal.create({
      data: {
        name: 'Lunch Salad',
        userId,
        mealType: 'SALAD',
      },
    });
    secondMealId = secondMeal.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.mealLog.deleteMany();
    await prisma.meal.deleteMany();
    await prisma.food.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/v1/meal-logs', () => {
    it('should create meal log successfully with all fields', async () => {
      const timestamp = new Date('2025-02-05T08:00:00Z').toISOString();

      const response = await request(app.getHttpServer())
        .post('/api/v1/meal-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .send({
          mealId,
          typeOfMeal: 'BREAKFAST',
          timestamp,
          eatenOut: false,
          mealFromPantry: false,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        userId,
        mealId,
        typeOfMeal: 'BREAKFAST',
        mealFromPantry: false,
        eatenOut: false,
      });

      expect(new Date(response.body.timestamp).toISOString()).toBe(timestamp);
      // Store for later tests
      mealLogId = response.body.id;
    });

    it('should create meal log with default timestamp when not provided', async () => {
      const beforeCreate = new Date();

      const response = await request(app.getHttpServer())
        .post('/api/v1/meal-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .send({
          mealId: secondMealId,
          typeOfMeal: 'LUNCH',
        })
        .expect(201);

      const afterCreate = new Date();
      const timestamp = new Date(response.body.timestamp);

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime(),
      );
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should auto-detect mealFromPantry when meal has pantryItemId', async () => {
      // Create pantry first
      const pantry = await prisma.pantry.create({
        data: {
          userId,
          title: 'Test Pantry',
        },
      });

      // Create pantry item
      const pantryItem = await prisma.pantryItem.create({
        data: {
          quantity: 100,
          pantryId: pantry.id,
          foodId: (await prisma.food.findFirst())!.id,
        },
      });

      // Create meal with pantryItemId
      const mealWithPantry = await prisma.meal.create({
        data: {
          name: 'Pantry Meal',
          userId,
          mealType: 'SALAD',
          pantryItemId: pantryItem.id,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/meal-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .send({
          mealId: mealWithPantry.id,
          typeOfMeal: 'DINNER',
        })
        .expect(201);

      expect(response.body.mealFromPantry).toBe(true);
    });

    it('should reject creation without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/meal-logs')
        .send({
          mealId,
          typeOfMeal: 'BREAKFAST',
        })
        .expect(401);
    });

    it('should reject creation with invalid mealId', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/meal-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .send({
          mealId: '00000000-0000-0000-0000-000000000000',
          typeOfMeal: 'BREAKFAST',
        })
        .expect(404);
    });

    it('should reject creation with invalid typeOfMeal', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/meal-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .send({
          mealId,
          typeOfMeal: 'INVALID_TYPE',
        })
        .expect(400);
    });

    it('should reject creation with malformed timestamp', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/meal-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .send({
          mealId,
          typeOfMeal: 'BREAKFAST',
          timestamp: 'not-a-valid-date',
        })
        .expect(400);
    });

    it("should prevent user from logging another user's meal", async () => {
      // Create another user and meal
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-user@example.com',
          firstName: 'Other',
          lastName: 'User',
          keycloakId: 'test-keycloak-id-other',
        },
      });

      const otherMeal = await prisma.meal.create({
        data: {
          name: 'Other User Meal',
          userId: otherUser.id,
          mealType: 'SALAD',
        },
      });

      await request(app.getHttpServer())
        .post('/api/v1/meal-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .send({
          mealId: otherMeal.id,
          typeOfMeal: 'BREAKFAST',
        })
        .expect(404);
    });
  });

  describe('GET /api/v1/meal-logs', () => {
    beforeAll(async () => {
      // Create multiple meal logs for testing filters and pagination
      await prisma.mealLog.deleteMany({ where: { userId } });

      const now = new Date('2025-02-05T12:00:00Z');

      for (let i = 0; i < 15; i++) {
        const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const typeOfMeal: TypeOfMeal =
          i % 4 === 0
            ? 'BREAKFAST'
            : i % 4 === 1
              ? 'LUNCH'
              : i % 4 === 2
                ? 'DINNER'
                : 'SNACK';

        await prisma.mealLog.create({
          data: {
            userId,
            mealId: i % 2 === 0 ? mealId : secondMealId,
            typeOfMeal,
            timestamp,
            eatenOut: i % 3 === 0,
            mealFromPantry: i % 5 === 0,
          },
        });
      }
    });

    it('should list all meal logs with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/meal-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        limit: 10,
        totalPages: expect.any(Number),
      });

      expect(response.body.data.length).toBeLessThanOrEqual(10);
      expect(response.body.total).toBeGreaterThanOrEqual(15);
    });

    it('should paginate results correctly', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/api/v1/meal-logs?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(200);

      const page2 = await request(app.getHttpServer())
        .get('/api/v1/meal-logs?page=2&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(200);

      expect(page1.body.data.length).toBe(5);
      expect(page2.body.data.length).toBe(5);
      expect(page1.body.page).toBe(1);
      expect(page2.body.page).toBe(2);

      // Ensure no duplicate IDs between pages
      const page1Ids = page1.body.data.map((log: any) => log.id);
      const page2Ids = page2.body.data.map((log: any) => log.id);
      const intersection = page1Ids.filter((id: string) =>
        page2Ids.includes(id),
      );
      expect(intersection.length).toBe(0);
    });

    it('should filter by typeOfMeal', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/meal-logs?typeOfMeal=BREAKFAST')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((log: any) => {
        expect(log.typeOfMeal).toBe('BREAKFAST');
      });
    });

    it('should filter by date range', async () => {
      const dateFrom = '2025-02-01';
      const dateTo = '2025-02-05';

      const response = await request(app.getHttpServer())
        .get(`/api/v1/meal-logs?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((log: any) => {
        const logDate = new Date(log.timestamp);
        expect(logDate.getTime()).toBeGreaterThanOrEqual(
          new Date(dateFrom).getTime(),
        );
        expect(logDate.getTime()).toBeLessThanOrEqual(
          new Date(dateTo).getTime(),
        );
      });
    });

    it('should filter by eatenOut', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/meal-logs?eatenOut=true')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((log: any) => {
        expect(log.eatenOut).toBe(true);
      });
    });

    it('should filter by mealFromPantry', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/meal-logs?mealFromPantry=true')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((log: any) => {
        expect(log.mealFromPantry).toBe(true);
      });
    });

    it('should combine multiple filters', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/api/v1/meal-logs?typeOfMeal=BREAKFAST&eatenOut=false&dateFrom=2025-01-01',
        )
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(200);

      response.body.data.forEach((log: any) => {
        expect(log.typeOfMeal).toBe('BREAKFAST');
        expect(log.eatenOut).toBe(false);
        expect(new Date(log.timestamp).getTime()).toBeGreaterThanOrEqual(
          new Date('2025-01-01').getTime(),
        );
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/meal-logs').expect(401);
    });

    it('should only return logs for authenticated user', async () => {
      // Create another user with their own logs
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-user-2@example.com',
          firstName: 'Other',
          lastName: 'User2',
          keycloakId: 'test-keycloak-id-other-2',
        },
      });

      const otherMeal = await prisma.meal.create({
        data: {
          name: 'Other User Meal 2',
          userId: otherUser.id,
          mealType: 'SALAD',
        },
      });

      await prisma.mealLog.create({
        data: {
          userId: otherUser.id,
          mealId: otherMeal.id,
          typeOfMeal: 'BREAKFAST',
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/meal-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(200);

      // Should only see logs for current user
      response.body.data.forEach((log: any) => {
        expect(log.userId).toBe(userId);
      });
    });
  });

  describe('GET /api/v1/meal-logs/:id', () => {
    let testLogId: string;

    beforeAll(async () => {
      const log = await prisma.mealLog.create({
        data: {
          userId,
          mealId,
          typeOfMeal: 'BREAKFAST',
        },
      });
      testLogId = log.id;
    });

    it('should retrieve specific meal log', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/meal-logs/${testLogId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testLogId,
        userId,
        mealId,
        typeOfMeal: 'BREAKFAST',
      });
    });

    it('should return 404 for non-existent meal log', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/meal-logs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(404);
    });

    it("should prevent access to another user's meal log", async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-user-3@example.com',
          firstName: 'Other',
          lastName: 'User3',
          keycloakId: 'test-keycloak-id-other-3',
        },
      });

      const otherMeal = await prisma.meal.create({
        data: {
          name: 'Other User Meal 3',
          userId: otherUser.id,
          mealType: 'SALAD',
        },
      });

      const otherLog = await prisma.mealLog.create({
        data: {
          userId: otherUser.id,
          mealId: otherMeal.id,
          typeOfMeal: 'BREAKFAST',
        },
      });

      await request(app.getHttpServer())
        .get(`/api/v1/meal-logs/${otherLog.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/meal-logs/${testLogId}`)
        .expect(401);
    });
  });

  describe('PATCH /api/v1/meal-logs/:id', () => {
    let updateLogId: string;

    beforeAll(async () => {
      const log = await prisma.mealLog.create({
        data: {
          userId,
          mealId,
          typeOfMeal: 'BREAKFAST',
          timestamp: new Date('2025-02-05T08:00:00Z'),
        },
      });
      updateLogId = log.id;
    });

    it('should update meal log successfully', async () => {
      const newTimestamp = new Date('2025-02-05T10:30:00Z').toISOString();

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/meal-logs/${updateLogId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .send({
          typeOfMeal: 'BRUNCH',
          timestamp: newTimestamp,
          eatenOut: true,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: updateLogId,
        typeOfMeal: 'BRUNCH',
        eatenOut: true,
      });

      expect(new Date(response.body.timestamp).toISOString()).toBe(
        newTimestamp,
      );
    });

    it('should update only specified fields', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/meal-logs/${updateLogId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .send({
          mealFromPantry: true,
        })
        .expect(200);

      expect(response.body.mealFromPantry).toBe(true);
      // Other fields should remain unchanged
      expect(response.body.typeOfMeal).toBeDefined();
    });

    it('should return 404 for non-existent meal log', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/meal-logs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .send({ eatenOut: true })
        .expect(404);
    });

    it("should prevent updating another user's meal log", async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-user-4@example.com',
          firstName: 'Other',
          lastName: 'User4',
          keycloakId: 'test-keycloak-id-other-4',
        },
      });

      const otherMeal = await prisma.meal.create({
        data: {
          name: 'Other User Meal 4',
          userId: otherUser.id,
          mealType: 'SALAD',
        },
      });

      const otherLog = await prisma.mealLog.create({
        data: {
          userId: otherUser.id,
          mealId: otherMeal.id,
          typeOfMeal: 'BREAKFAST',
        },
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/meal-logs/${otherLog.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .send({ eatenOut: true })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/meal-logs/${updateLogId}`)
        .send({ eatenOut: true })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/meal-logs/:id', () => {
    let deleteLogId: string;

    beforeEach(async () => {
      const log = await prisma.mealLog.create({
        data: {
          userId,
          mealId,
          typeOfMeal: 'BREAKFAST',
        },
      });
      deleteLogId = log.id;
    });

    it('should delete meal log successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/meal-logs/${deleteLogId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(200);

      // Verify deletion
      const deletedLog = await prisma.mealLog.findUnique({
        where: { id: deleteLogId },
      });
      expect(deletedLog).toBeNull();
    });

    it('should return 404 for non-existent meal log', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/meal-logs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(404);
    });

    it("should prevent deleting another user's meal log", async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-user-5@example.com',
          firstName: 'Other',
          lastName: 'User5',
          keycloakId: 'test-keycloak-id-other-5',
        },
      });

      const otherMeal = await prisma.meal.create({
        data: {
          name: 'Other User Meal 5',
          userId: otherUser.id,
          mealType: 'SALAD',
        },
      });

      const otherLog = await prisma.mealLog.create({
        data: {
          userId: otherUser.id,
          mealId: otherMeal.id,
          typeOfMeal: 'BREAKFAST',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/meal-logs/${otherLog.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-User-ID', userId)
        .expect(404);

      // Verify it still exists
      const stillExists = await prisma.mealLog.findUnique({
        where: { id: otherLog.id },
      });
      expect(stillExists).not.toBeNull();
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/meal-logs/${deleteLogId}`)
        .expect(401);
    });
  });
});
