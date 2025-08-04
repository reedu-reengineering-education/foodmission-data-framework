/**
 * E2E test setup
 * This file is executed before e2e tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { LoggingService } from '../src/common/logging/logging.service';
import { execSync } from 'child_process';
import 'reflect-metadata';

let app: INestApplication | undefined;
let prisma: PrismaClient | undefined;
let moduleFixture: TestingModule | undefined;

beforeAll(async () => {
  // Initialize test database
  prisma = new PrismaClient({
    datasources: {
      db: {
        url:
          process.env.TEST_DATABASE_URL ||
          'postgresql://postgres:password@localhost:5432/foodmission_test_db',
      },
    },
  });

  // Reset and migrate database
  try {
    execSync('npx prisma migrate reset --force --skip-seed', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: 'inherit',
    });

    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Database setup failed:', error);
  }

  // Create NestJS application
  moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  app = moduleFixture.createNestApplication();

  // Configure application
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

  // Set up global test utilities
  global.e2eTestUtils = {
    app,
    prisma,
    moduleFixture,
    mockAuthGuard,
    mockRolesGuard,

    // Helper to create authenticated request context
    createAuthContext: (userId = 'e2e-user-1', roles = ['user']) => ({
      user: {
        sub: userId,
        preferred_username: 'testuser',
        email: 'test@example.com',
        roles,
      },
    }),

    // Helper to get test data
    getTestData: async () => {
      if (!prisma) return { foods: [], users: [] };

      const foods = await prisma.food.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          barcode: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      const users = await prisma.user.findMany();

      return { foods, users };
    },
  };
});

beforeEach(async () => {
  if (!prisma) return;

  // Clean database between tests
  await prisma.user.deleteMany();
  await prisma.food.deleteMany();

  // Seed basic test data
  await seedE2ETestData();
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
  if (prisma) {
    await prisma.$disconnect();
  }
});

async function seedE2ETestData() {
  if (!prisma) return;

  // Create test foods
  await prisma.food.createMany({
    data: [
      {
        name: 'Apple',
        description: 'Fresh red apple',
        barcode: '1234567890',
        createdBy: 'test-user',
      },
      {
        name: 'Banana',
        description: 'Yellow banana',
        barcode: '0987654321',
        createdBy: 'test-user',
      },
      {
        name: 'Carrot',
        description: 'Orange carrot',
        barcode: '1122334455',
        createdBy: 'test-user',
      },
    ],
  });

  // Create test users
  const user1 = await prisma.user.create({
    data: {
      keycloakId: 'e2e-user-1',
      email: 'user1@e2e.com',
      firstName: 'E2E',
      lastName: 'User1',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      keycloakId: 'e2e-user-2',
      email: 'user2@e2e.com',
      firstName: 'E2E',
      lastName: 'User2',
    },
  });

  // Update users with preferences
  await prisma.user.update({
    where: { id: user1.id },
    data: {
      preferences: {
        dietaryRestrictions: ['vegetarian'],
        allergies: ['nuts'],
      },
    },
  });

  await prisma.user.update({
    where: { id: user2.id },
    data: {
      preferences: {
        dietaryRestrictions: [],
        allergies: ['dairy'],
      },
    },
  });
}

// Mock authentication for e2e tests
const mockAuthGuard = {
  canActivate: jest.fn(() => true),
};

const mockRolesGuard = {
  canActivate: jest.fn(() => true),
};

declare global {
  var e2eTestUtils: {
    app: INestApplication;
    prisma: PrismaClient;
    moduleFixture: TestingModule;
    mockAuthGuard: any;
    mockRolesGuard: any;
    createAuthContext: (userId?: string, roles?: string[]) => any;
    getTestData: () => Promise<any>;
  };
}
