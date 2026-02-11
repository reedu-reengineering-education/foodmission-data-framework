import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserProfileService } from './user-profile.service';
import { UserRepository } from '../user/repositories/user.repository';
import { CacheInterceptor } from '../cache/cache.interceptor';
import { CacheEvictInterceptor } from '../cache/cache-evict.interceptor';
import { LoggingService } from '../common/logging/logging.service';
import { Reflector } from '@nestjs/core';
import { createMockLoggingService } from '../common/testing';

describe('UserProfileService - Caching Integration', () => {
  let service: UserProfileService;
  let userRepository: jest.Mocked<UserRepository>;

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    keycloakId: 'keycloak123',
    preferences: { theme: 'dark', language: 'en' },
    settings: { notifications: true },
    shouldAutoAddToPantry: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockKeycloakUser = {
    sub: 'keycloak123',
    email: 'test@example.com',
    given_name: 'John',
    family_name: 'Doe',
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findByKeycloakId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockLoggingService = createMockLoggingService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        CacheInterceptor,
        CacheEvictInterceptor,
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
    userRepository = module.get(UserRepository);
    // cacheManager = module.get(CACHE_MANAGER);
  });

  describe('getOrCreateProfile with @Cacheable', () => {
    it('should return existing user profile', async () => {
      userRepository.findByKeycloakId.mockResolvedValue(mockUser);

      const result = await service.getOrCreateProfile(mockKeycloakUser);

      expect(userRepository.findByKeycloakId).toHaveBeenCalledWith(
        'keycloak123',
      );
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        keycloakId: mockUser.keycloakId,
        preferences: mockUser.preferences,
        settings: mockUser.settings,
      });
    });

    it('should create new user when not found', async () => {
      userRepository.findByKeycloakId.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        ...mockUser,
        preferences: {},
        settings: null,
      });

      const result = await service.getOrCreateProfile(mockKeycloakUser);

      expect(userRepository.findByKeycloakId).toHaveBeenCalledWith(
        'keycloak123',
      );
      expect(userRepository.create).toHaveBeenCalledWith({
        keycloakId: 'keycloak123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        preferences: {},
      });
      expect(result.keycloakId).toBe('keycloak123');
    });

    it('should handle missing optional fields', async () => {
      const keycloakUserMinimal = {
        sub: 'keycloak123',
        email: 'test@example.com',
      };

      userRepository.findByKeycloakId.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        ...mockUser,
        firstName: '',
        lastName: '',
        preferences: {},
        settings: null,
      });

      const result = await service.getOrCreateProfile(keycloakUserMinimal);

      expect(userRepository.create).toHaveBeenCalledWith({
        keycloakId: 'keycloak123',
        email: 'test@example.com',
        firstName: '',
        lastName: '',
        preferences: {},
      });
      expect(result.firstName).toBe('');
      expect(result.lastName).toBe('');
    });
  });

  describe('updatePreferences with @CacheEvict', () => {
    const newPreferences = { theme: 'light', language: 'es' };

    it('should update user preferences successfully', async () => {
      const updatedUser = {
        ...mockUser,
        preferences: newPreferences,
      };

      userRepository.findByKeycloakId.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updatePreferences(
        'keycloak123',
        newPreferences,
      );

      expect(userRepository.findByKeycloakId).toHaveBeenCalledWith(
        'keycloak123',
      );
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        preferences: newPreferences,
      });
      expect(result.preferences).toEqual(newPreferences);
    });

    it('should throw error when user not found', async () => {
      userRepository.findByKeycloakId.mockResolvedValue(null);

      await expect(
        service.updatePreferences('keycloak123', newPreferences),
      ).rejects.toThrow('User not found');

      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('updateSettings with @CacheEvict', () => {
    const newSettings = { notifications: false, darkMode: true };

    it('should update user settings successfully', async () => {
      const updatedUser = {
        ...mockUser,
        settings: newSettings,
      };

      userRepository.findByKeycloakId.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateSettings('keycloak123', newSettings);

      expect(userRepository.findByKeycloakId).toHaveBeenCalledWith(
        'keycloak123',
      );
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        settings: newSettings,
      });
      expect(result.settings).toEqual(newSettings);
    });

    it('should throw error when user not found', async () => {
      userRepository.findByKeycloakId.mockResolvedValue(null);

      await expect(
        service.updateSettings('keycloak123', newSettings),
      ).rejects.toThrow('User not found');

      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });
});
