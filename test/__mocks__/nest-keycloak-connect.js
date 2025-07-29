// Mock for nest-keycloak-connect
module.exports = {
  Public: () => () => {},
  Roles: () => () => {},
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn(() => true),
  })),
  RoleGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn(() => true),
  })),
  KeycloakConnectModule: {
    register: jest.fn(() => ({
      module: 'KeycloakConnectModule',
      providers: [],
      exports: [],
    })),
  },
};