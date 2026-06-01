/**
 * Legacy full-app e2e setup.
 * Kept under e2e/helpers for consistent folder organization.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { GlobalExceptionFilter } from '../../../src/common/filters/global-exception.filter';
import { LoggingService } from '../../../src/common/logging/logging.service';
import { execSync } from 'child_process';
import 'reflect-metadata';

let app: INestApplication | undefined;
let prisma: PrismaClient | undefined;
let moduleFixture: TestingModule | undefined;

beforeAll(async () => {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url:
          process.env.TEST_DATABASE_URL ||
          'postgresql://postgres:password@localhost:5432/foodmission_test_db',
      },
    },
  });

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

  moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  app = moduleFixture.createNestApplication();
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
});

afterAll(async () => {
  if (app) await app.close();
  if (prisma) await prisma.$disconnect();
});
