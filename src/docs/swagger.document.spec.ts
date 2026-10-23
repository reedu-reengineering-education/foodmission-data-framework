import { Controller, Get, INestApplication, SetMetadata } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { createOpenApiDocument } from './swagger.document';

// What nest-keycloak-connect's @Roles does (it is mocked to a no-op in Jest).
const Roles = (...roles: string[]) => SetMetadata('roles', roles);

abstract class BaseAdminController {
  @Get('base-admin')
  @Roles('admin')
  @ApiOperation({ summary: 'Inherited admin route' })
  baseAdmin() {
    return 'ok';
  }

  @Get('base-open')
  @ApiOperation({ summary: 'Inherited open route' })
  baseOpen() {
    return 'ok';
  }
}

@Controller('child')
class ChildController extends BaseAdminController {
  @Get('own-admin')
  @Roles('admin')
  @ApiOperation({ summary: 'Own admin route' })
  ownAdmin() {
    return 'ok';
  }
}

@Controller('overriding')
class OverridingController extends BaseAdminController {
  @Get('base-admin')
  @Roles('user', 'admin')
  @ApiOperation({ summary: 'Overridden for users' })
  baseAdmin() {
    return 'ok';
  }
}

describe('createOpenApiDocument admin-only labels', () => {
  let app: INestApplication;
  let paths: Record<
    string,
    { get: { summary?: string; description?: string } }
  >;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ChildController, OverridingController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    paths = createOpenApiDocument(app).paths as typeof paths;
  });

  afterAll(() => app.close());

  it('labels admin routes inherited from a base controller', () => {
    expect(paths['/child/base-admin'].get.summary).toBe(
      'Inherited admin route (Admin only)',
    );
    expect(paths['/child/base-admin'].get.description).toContain(
      'Access: Admin only.',
    );
  });

  it('labels the controller’s own admin routes', () => {
    expect(paths['/child/own-admin'].get.summary).toBe(
      'Own admin route (Admin only)',
    );
  });

  it('does not label routes without the admin-only role', () => {
    expect(paths['/child/base-open'].get.summary).toBe('Inherited open route');
    expect(paths['/child/base-open'].get.description).toBeUndefined();
  });

  it('uses the overriding definition when a subclass redefines a route', () => {
    expect(paths['/overriding/base-admin'].get.summary).toBe(
      'Overridden for users',
    );
  });
});
