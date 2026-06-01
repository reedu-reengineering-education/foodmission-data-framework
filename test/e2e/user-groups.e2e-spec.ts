import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { DataBaseAuthGuard } from '../../src/common/guards/database-auth.guards';
import { PrismaService } from '../../src/database/prisma.service';
import { UserGroupController } from '../../src/user-groups/controllers/user-groups.controller';
import { GroupMembershipRepository } from '../../src/user-groups/repositories/group-memberships.repository';
import { UserGroupRepository } from '../../src/user-groups/repositories/user-groups.repository';
import { UserGroupService } from '../../src/user-groups/services/user-groups.service';
import { closeTestApp, createTestApp } from './helpers/app-e2e-helpers';
import { createTestPrismaClient } from './helpers/prisma-e2e-helpers';

describe('User Groups (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const authUser = {
    id: '00000000-0000-0000-0000-00000000cc01',
    sub: 'e2e-group-user',
    email: 'e2e-group-user@test.com',
  };

  beforeAll(async () => {
    prisma = createTestPrismaClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UserGroupController],
      providers: [
        UserGroupService,
        UserGroupRepository,
        GroupMembershipRepository,
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
    await prisma.groupMembership.deleteMany({
      where: { createdBy: authUser.id },
    });
    await prisma.userGroup.deleteMany({ where: { createdBy: authUser.id } });
    await prisma.user.upsert({
      where: { id: authUser.id },
      update: { keycloakId: authUser.sub, email: authUser.email },
      create: {
        id: authUser.id,
        keycloakId: authUser.sub,
        email: authUser.email,
      },
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
    await prisma.$disconnect();
  });

  it('GET/POST/GET by id/DELETE user groups', async () => {
    const created = await request(app.getHttpServer())
      .post('/user-groups')
      .send({ name: 'My E2E Group', description: 'test group' })
      .expect(201);
    const groupId = created.body.id;

    await request(app.getHttpServer()).get('/user-groups').expect(200);
    await request(app.getHttpServer())
      .get(`/user-groups/${groupId}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/user-groups/${groupId}`)
      .expect(200);
  });
});
