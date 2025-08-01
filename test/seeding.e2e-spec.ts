import { PrismaClient } from '@prisma/client';
import { seedFoods } from '../prisma/seeds/foods';
import { seedUsers } from '../prisma/seeds/users';

describe('Database Seeding (e2e)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.TEST_DATABASE_URL ||
            'postgresql://postgres:password@localhost:5432/foodmission_test_db',
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database before each test
    try {
      await prisma.user.deleteMany();
      await prisma.food.deleteMany();
    } catch {
      // If there are constraint issues, try to clean up more thoroughly
      await prisma.$executeRaw`TRUNCATE TABLE "users", "foods" RESTART IDENTITY CASCADE`;
    }
  });

  describe('Food Seeding', () => {
    it('should seed foods successfully', async () => {
      const foods = await seedFoods(prisma);

      expect(foods).toBeDefined();
      expect(foods.length).toBeGreaterThan(0);

      // Verify foods were created in database
      const dbFoods = await prisma.food.findMany();
      expect(dbFoods.length).toBe(foods.length);

      // Check for expected foods
      const foodNames = dbFoods.map((food) => food.name);
      expect(foodNames).toContain('Apple');
      expect(foodNames).toContain('Banana');

      // Verify food properties
      const apple = dbFoods.find((food) => food.name === 'Apple');
      expect(apple).toBeDefined();
      expect(apple?.description).toBeDefined();
      expect(apple?.barcode).toBeDefined();
      expect(apple?.createdBy).toBe('system-seed');
    });

    it('should handle duplicate seeding gracefully', async () => {
      // Run seeding twice
      const firstRun = await seedFoods(prisma);
      const secondRun = await seedFoods(prisma);

      expect(firstRun.length).toBe(secondRun.length);

      // Verify no duplicates were created
      const dbFoods = await prisma.food.findMany();
      expect(dbFoods.length).toBe(firstRun.length);
    });

    it('should create foods with valid data', async () => {
      await seedFoods(prisma);

      const foods = await prisma.food.findMany();

      foods.forEach((food) => {
        expect(food.id).toBeDefined();
        expect(food.name).toBeDefined();
        expect(food.name.length).toBeGreaterThan(0);
        expect(food.createdBy).toBe('system-seed');
        expect(food.createdAt).toBeInstanceOf(Date);
        expect(food.updatedAt).toBeInstanceOf(Date);

        if (food.barcode) {
          expect(food.barcode.length).toBeGreaterThan(0);
        }

        if (food.description) {
          expect(food.description.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('User Seeding', () => {
    it('should seed users successfully', async () => {
      const users = await seedUsers(prisma);

      expect(users).toBeDefined();
      expect(users.length).toBeGreaterThan(0);

      // Verify users were created in database
      const dbUsers = await prisma.user.findMany();
      expect(dbUsers.length).toBe(users.length);

      // Check for expected users
      const userEmails = dbUsers.map((user) => user.email);
      expect(userEmails.length).toBeGreaterThan(0);

      // Verify user properties
      const firstUser = dbUsers[0];
      expect(firstUser).toBeDefined();
      expect(firstUser.keycloakId).toBeDefined();
      expect(firstUser.email).toBeDefined();
      expect(firstUser.firstName).toBeDefined();
      expect(firstUser.lastName).toBeDefined();
    });

    it('should handle duplicate user seeding gracefully', async () => {
      // Run seeding twice
      const firstRun = await seedUsers(prisma);
      const secondRun = await seedUsers(prisma);

      expect(firstRun.length).toBe(secondRun.length);

      // Verify no duplicates were created
      const dbUsers = await prisma.user.findMany();
      expect(dbUsers.length).toBe(firstRun.length);
    });

    it('should create users with valid data', async () => {
      await seedUsers(prisma);

      const users = await prisma.user.findMany();

      users.forEach((user) => {
        expect(user.id).toBeDefined();
        expect(user.keycloakId).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.firstName).toBeDefined();
        expect(user.lastName).toBeDefined();
        expect(user.createdAt).toBeInstanceOf(Date);
        expect(user.updatedAt).toBeInstanceOf(Date);

        // Validate email format
        expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe('Complete Seeding Process', () => {
    it('should seed all data types successfully', async () => {
      // Seed in correct order
      const foods = await seedFoods(prisma);
      const users = await seedUsers(prisma);

      expect(foods.length).toBeGreaterThan(0);
      expect(users.length).toBeGreaterThan(0);

      // Verify all data exists
      const dbFoods = await prisma.food.findMany();
      const dbUsers = await prisma.user.findMany();

      expect(dbFoods.length).toBe(foods.length);
      expect(dbUsers.length).toBe(users.length);
    });

    it('should maintain data integrity across seeding', async () => {
      await seedFoods(prisma);
      await seedUsers(prisma);

      // Check that all foods have valid creators
      const foods = await prisma.food.findMany();
      foods.forEach((food) => {
        expect(food.createdBy).toBeDefined();
        expect(food.createdBy.length).toBeGreaterThan(0);
      });

      // Check that all users have unique identifiers
      const users = await prisma.user.findMany();
      const keycloakIds = users.map((user) => user.keycloakId);
      const emails = users.map((user) => user.email);

      expect(new Set(keycloakIds).size).toBe(keycloakIds.length);
      expect(new Set(emails).size).toBe(emails.length);
    });
  });
});
