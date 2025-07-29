// Mock for keycloak-connect
module.exports = jest.fn().mockImplementation(() => ({
  middleware: jest.fn(),
  protect: jest.fn(),
  enforcer: jest.fn(),
}));
