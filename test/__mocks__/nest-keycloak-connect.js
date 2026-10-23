// Mock for nest-keycloak-connect

// A real class so Nest can scan `KeycloakConnectModule.register()` when a test
// compiles the full AppModule.
class KeycloakConnectModule {}

const { META_ROLES, Roles } = jest.requireActual(
  'nest-keycloak-connect/decorators/roles.decorator.js',
);

module.exports = {
  META_ROLES,
  Public: () => () => {},
  Roles,
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
