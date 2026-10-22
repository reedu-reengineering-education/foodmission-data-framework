// Mock for nest-keycloak-connect

// A real class so Nest can scan `KeycloakConnectModule.register()` when a test
// compiles the full AppModule.
class KeycloakConnectModule {}

const { SetMetadata } = require('@nestjs/common');

const META_ROLES = 'roles';

module.exports = {
  META_ROLES,
  Public: () => () => {},
  Roles: (...roles) => SetMetadata(META_ROLES, roles),
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn(() => true),
  })),
  RoleGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn(() => true),
  })),
  ResourceGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn(() => true),
  })),
  KeycloakConnectModule: Object.assign(KeycloakConnectModule, {
    register: jest.fn(() => ({
      module: KeycloakConnectModule,
      providers: [],
      exports: [],
    })),
  }),
};
