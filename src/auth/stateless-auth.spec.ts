import { AuthController } from './auth.controller';
import { UserProfilesService } from '../users/services/user-profiles.service';

describe('Stateless Authentication', () => {
  let controller: AuthController;
  let userProfileService: jest.Mocked<UserProfilesService>;
  const originalEnv = process.env;

  beforeEach(() => {
    userProfileService = {
      getOrCreateProfile: jest.fn(),
    } as any;

    // Mock environment variables
    process.env = {
      ...originalEnv,
      KEYCLOAK_BASE_URL: 'http://localhost:8081',
      KEYCLOAK_REALM: 'foodmission',
      KEYCLOAK_WEB_CLIENT_ID: 'foodmission-web',
      FRONTEND_URL: 'http://localhost:3000',
    };

    const authService = { register: jest.fn(), login: jest.fn() } as any;
    controller = new AuthController(userProfileService as any, authService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAuthInfo', () => {
    it('should return Keycloak configuration for frontend', () => {
      const result = controller.getAuthInfo();

      expect(result).toEqual({
        authServerUrl: 'http://localhost:8081',
        realm: 'foodmission',
        clientId: 'foodmission-web',
        redirectUri: 'http://localhost:3000',
      });
    });

    it('should use environment variables', () => {
      const result = controller.getAuthInfo();

      expect(result.authServerUrl).toBeDefined();
      expect(result.realm).toBeDefined();
      expect(result.clientId).toBeDefined();
      expect(result.redirectUri).toBeDefined();
    });
  });

  // getProfile tests removed; now covered in admin.controller.spec.ts if admin-only logic is needed

  describe('getTokenInfo', () => {
    it('should return JWT token information', () => {
      const mockUser = {
        sub: 'keycloak-user-id',
        email: 'test@example.com',
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        resource_access: {
          'foodmission-api': {
            roles: ['user', 'admin'],
          },
        },
        exp: 1640995200,
        iat: 1640991600,
      };

      const result = controller.getTokenInfo(mockUser);

      expect(result).toEqual({
        sub: mockUser.sub,
        email: mockUser.email,
        name: mockUser.name,
        given_name: mockUser.given_name,
        family_name: mockUser.family_name,
        roles: ['user', 'admin'],
        exp: mockUser.exp,
        iat: mockUser.iat,
      });
    });
  });

  describe('healthCheck', () => {
    it('should return health status', () => {
      const result = controller.healthCheck();

      expect(result).toEqual({
        status: 'ok',
        service: 'auth',
      });
    });
  });
});
