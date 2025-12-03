import { AuthController } from './auth.controller';
import { UserProfileService } from './user-profile.service';

describe('Stateless Authentication', () => {
  let controller: AuthController;
  let userProfileService: jest.Mocked<UserProfileService>;

  beforeEach(() => {
    userProfileService = {
      getOrCreateProfile: jest.fn(),
      updatePreferences: jest.fn(),
      updateSettings: jest.fn(),
    } as any;

    controller = new AuthController(userProfileService);
  });

  describe('getAuthInfo', () => {
    it('should return Keycloak configuration for frontend', () => {
      const result = controller.getAuthInfo();

      expect(result).toEqual({
        authServerUrl: expect.any(String),
        realm: expect.any(String),
        clientId: expect.any(String),
        redirectUri: expect.any(String),
      });
    });

    it('should use environment variables or defaults', () => {
      const result = controller.getAuthInfo();

      expect(result.authServerUrl).toBeDefined();
      expect(result.realm).toBeDefined();
      expect(result.clientId).toBeDefined();
      expect(result.redirectUri).toBeDefined();
    });
  });

  describe('getProfile', () => {
    it('should get or create user profile from Keycloak token', async () => {
      const mockUser = {
        sub: 'keycloak-user-id',
        email: 'test@example.com',
        given_name: 'John',
        family_name: 'Doe',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      const mockProfile = {
        id: 'user-uuid',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        keycloakId: 'keycloak-user-id',
        preferences: {},
        settings: {},
      };

      userProfileService.getOrCreateProfile.mockResolvedValue(mockProfile);

      const req = { user: mockUser };
      const result = await controller.getProfile(req);

      expect(userProfileService.getOrCreateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.sub,
          email: mockUser.email,
          given_name: mockUser.given_name,
          family_name: mockUser.family_name,
        }),
      );
      expect(result).toEqual(mockProfile);
    });

    it('should throw UnauthorizedException if user not authenticated', async () => {
      const req = { user: null } as any;

      await expect(controller.getProfile(req)).rejects.toThrow(
        'User not authenticated',
      );
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const mockUser = { sub: 'keycloak-user-id' };
      const preferences = { theme: 'dark', language: 'en' };
      const updatedProfile = {
        id: 'user-uuid',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        keycloakId: 'keycloak-user-id',
        preferences,
        settings: {},
      };

      userProfileService.updatePreferences.mockResolvedValue(updatedProfile);

      const req = {
        user: {
          ...mockUser,
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        },
      };
      const result = await controller.updatePreferences(req, preferences);

      expect(userProfileService.updatePreferences).toHaveBeenCalledWith(
        mockUser.sub,
        preferences,
      );
      expect(result).toEqual(updatedProfile);
    });
  });

  describe('updateSettings', () => {
    it('should update user settings', async () => {
      const mockUser = { sub: 'keycloak-user-id' };
      const settings = { notifications: true, privacy: 'public' };
      const updatedProfile = {
        id: 'user-uuid',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        keycloakId: 'keycloak-user-id',
        preferences: {},
        settings,
      };

      userProfileService.updateSettings.mockResolvedValue(updatedProfile);

      const req = {
        user: {
          ...mockUser,
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        },
      };
      const result = await controller.updateSettings(req, settings);

      expect(userProfileService.updateSettings).toHaveBeenCalledWith(
        mockUser.sub,
        settings,
      );
      expect(result).toEqual(updatedProfile);
    });
  });

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

      const req = { user: mockUser };
      const result = controller.getTokenInfo(req);

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

  describe('adminEndpoint', () => {
    it('should return admin access granted message', () => {
      const result = controller.adminEndpoint();

      expect(result).toEqual({
        message: 'Admin access granted',
        status: 'success',
      });
    });
  });
});
