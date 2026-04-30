import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';

export async function createTestApp(
  moduleFixture: TestingModule,
  configure?: (app: INestApplication) => void,
) {
  const app = moduleFixture.createNestApplication();
  configure?.(app);
  await app.init();
  return app;
}

export async function closeTestApp(app?: INestApplication) {
  if (app) await app.close();
}
