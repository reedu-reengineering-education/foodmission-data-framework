import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaClient } from '@prisma/client';
import { CacheEvictInterceptor } from '../../../src/cache/cache-evict.interceptor';
import { CacheInterceptor } from '../../../src/cache/cache.interceptor';
import { DataBaseAuthGuard } from '../../../src/common/guards/database-auth.guards';
import { createTestPrismaClient, setupDbSuite } from '../../test-utils/db-e2e-helpers';

export type E2EAuthUser = {
  id: string;
  sub: string;
  email: string;
};

export async function setupCatalogDb(): Promise<{
  prisma: PrismaClient;
  skipSuite: boolean;
}> {
  const prisma = createTestPrismaClient();
  const dbReady = await setupDbSuite(prisma);
  return { prisma, skipSuite: !dbReady };
}

export function createAuthGuardMock(authUser: E2EAuthUser) {
  return {
    canActivate: (ctx: any) => {
      const req = ctx.switchToHttp().getRequest();
      req.user = { ...authUser };
      return true;
    },
  };
}

export async function createCatalogFeatureApp(params: {
  controllers: any[];
  providers: any[];
  authGuardMock: any;
}): Promise<{ app: INestApplication; moduleFixture: TestingModule }> {
  const moduleFixture = await Test.createTestingModule({
    controllers: params.controllers,
    providers: params.providers,
  })
    .overrideGuard(DataBaseAuthGuard)
    .useValue(params.authGuardMock)
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .overrideInterceptor(CacheInterceptor)
    .useValue({ intercept: (_ctx: any, next: any) => next.handle() })
    .overrideInterceptor(CacheEvictInterceptor)
    .useValue({ intercept: (_ctx: any, next: any) => next.handle() })
    .compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return { app, moduleFixture };
}

export async function seedAuthUser(prisma: PrismaClient, authUser: E2EAuthUser) {
  await prisma.user.upsert({
    where: { id: authUser.id },
    update: { keycloakId: authUser.sub, email: authUser.email },
    create: {
      id: authUser.id,
      keycloakId: authUser.sub,
      email: authUser.email,
      firstName: 'E2E',
      lastName: 'Admin',
    },
  });
}
