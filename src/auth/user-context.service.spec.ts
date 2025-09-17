import { Test, TestingModule } from '@nestjs/testing';
import { UserContextService } from './user-context.service';
import { UserProfileService } from './user-profile.service';

describe('UserContextService', () => {
  let service: UserContextService;
  let userProfileService: jest.Mocked<UserProfileService>;

  beforeEach(async () => {
    const mockUserProfileService = {
      getUserIdFromKeycloakId: jest.fn(),
      getOrCreateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserContextService,
        {
          provide: UserProfileService,
          useValue: mockUserProfileService,
        },
      ],
    }).compile();

    service = module.get<UserContextService>(UserContextService);
    userProfileService = module.get(UserProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getKeycloakIdFromRequest', () => {
    it('should extract keycloak ID from request', () => {
      const req = { user: { sub: 'keycloak-123' } };
      const result = service.getKeycloakIdFromRequest(req);
      expect(result).toBe('keycloak-123');
    });

    it('should throw error if no keycloak ID found', () => {
      const req = { user: {} };
      expect(() => service.getKeycloakIdFromRequest(req)).toThrow(
        'User not authenticated - no keycloak ID found',
      );
    });

    it('should throw error if no user in request', () => {
      const req = {};
      expect(() => service.getKeycloakIdFromRequest(req)).toThrow(
        'User not authenticated - no keycloak ID found',
      );
    });
  });

  describe('getUserIdFromRequest', () => {
    it('should get internal user ID from request', async () => {
      const req = { user: { sub: 'keycloak-123' } };
      userProfileService.getUserIdFromKeycloakId.mockResolvedValue('user-456');

      const result = await service.getUserIdFromRequest(req);

      expect(userProfileService.getUserIdFromKeycloakId).toHaveBeenCalledWith(
        'keycloak-123',
      );
      expect(result).toBe('user-456');
    });
  });

  describe('getUserProfileFromRequest', () => {
    it('should get full user profile from request', async () => {
      const req = {
        user: {
          sub: 'keycloak-123',
          email: 'test@example.com',
          given_name: 'John',
          family_name: 'Doe',
        },
      };
      const mockProfile = {
        id: 'user-456',
        keycloakId: 'keycloak-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      userProfileService.getOrCreateProfile.mockResolvedValue(mockProfile);

      const result = await service.getUserProfileFromRequest(req);

      expect(userProfileService.getOrCreateProfile).toHaveBeenCalledWith({
        sub: 'keycloak-123',
        email: 'test@example.com',
        given_name: 'John',
        family_name: 'Doe',
      });
      expect(result).toBe(mockProfile);
    });
  });
});
