import { Test, TestingModule } from '@nestjs/testing';
import { UserProfilesController } from './user-profiles.controller';
import { UserProfilesService } from '../services/user-profiles.service';
import { NotFoundException } from '@nestjs/common';
import { ProfileUpdateDto } from '../dto/profile-update.dto';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { GamificationProfileService } from '../../gamification/services/gamification-profile.service';

describe('UserProfilesController', () => {
  let controller: UserProfilesController;
  let service: jest.Mocked<UserProfilesService>;
  let gamificationProfileService: jest.Mocked<
    Pick<GamificationProfileService, 'getProfileForUserId'>
  >;

  const mockUserProfile = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    keycloakId: 'kc-1',
    preferences: {},
    settings: {},
    username: 'testuser',
    yearOfBirth: 1990,
    country: 'US',
    region: 'CA',
    zip: '12345',
    language: 'en',
  };

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<UserProfilesService>> = {
      getProfileByUserId: jest.fn(),
      updateProfile: jest.fn(),
      isBasicProfileComplete: jest.fn(),
      deleteUserById: jest.fn(),
    };

    gamificationProfileService = {
      getProfileForUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProfilesController],
      providers: [
        { provide: UserProfilesService, useValue: mockService },
        {
          provide: GamificationProfileService,
          useValue: gamificationProfileService,
        },
      ],
    })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(UserProfilesController);
    service = module.get(UserProfilesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('returns completeness boolean', async () => {
      service.getProfileByUserId.mockResolvedValue(mockUserProfile);
      service.isBasicProfileComplete.mockResolvedValue(true);

      await expect(controller.getMyProfile('user-1')).resolves.toBe(true);
      expect(service.isBasicProfileComplete).toHaveBeenCalledWith('kc-1');
    });

    it('returns false when user is missing', async () => {
      service.getProfileByUserId.mockResolvedValue(null);

      await expect(controller.getMyProfile('user-1')).resolves.toBe(false);
      expect(service.isBasicProfileComplete).not.toHaveBeenCalled();
    });
  });

  describe('getMyFullProfile', () => {
    it('returns profile or 404', async () => {
      service.getProfileByUserId.mockResolvedValue(mockUserProfile);
      await expect(controller.getMyFullProfile('user-1')).resolves.toEqual(
        mockUserProfile,
      );

      service.getProfileByUserId.mockResolvedValue(null);
      await expect(controller.getMyFullProfile('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMyGamificationProfile', () => {
    it('delegates to GamificationProfileService', async () => {
      const profile = { userId: 'user-1' } as any;
      gamificationProfileService.getProfileForUserId.mockResolvedValue(profile);

      await expect(
        controller.getMyGamificationProfile('user-1', {
          eventsLimit: 5,
          walletEntriesLimit: 10,
        }),
      ).resolves.toEqual(profile);
      expect(
        gamificationProfileService.getProfileForUserId,
      ).toHaveBeenCalledWith('user-1', {
        eventsLimit: 5,
        walletEntriesLimit: 10,
      });
    });
  });

  describe('updateProfile', () => {
    it('updates via service and strips undefined fields', async () => {
      const updateDto = {
        country: 'DE',
        region: undefined,
        zip: '10115',
      } as ProfileUpdateDto;

      service.getProfileByUserId.mockResolvedValue(mockUserProfile);
      service.updateProfile.mockResolvedValue({
        ...mockUserProfile,
        country: 'DE',
        zip: '10115',
      });

      await controller.updateProfile('user-1', updateDto);

      expect(service.updateProfile).toHaveBeenCalledWith('kc-1', {
        country: 'DE',
        zip: '10115',
      });
    });

    it('returns user unchanged when body is empty', async () => {
      service.getProfileByUserId.mockResolvedValue(mockUserProfile);

      await expect(controller.updateProfile('user-1', {})).resolves.toEqual(
        mockUserProfile,
      );
      expect(service.updateProfile).not.toHaveBeenCalled();
    });

    it('throws when user is missing', async () => {
      service.getProfileByUserId.mockResolvedValue(null);

      await expect(controller.updateProfile('user-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteMe', () => {
    it('maps deleteAll query to cascade flag', async () => {
      service.deleteUserById.mockResolvedValue(undefined);

      await expect(controller.deleteMe('user-1', 'true')).resolves.toEqual({
        deleted: true,
        cascade: true,
      });
      expect(service.deleteUserById).toHaveBeenCalledWith('user-1', true);

      await expect(controller.deleteMe('user-1', 'yes')).resolves.toEqual({
        deleted: true,
        cascade: false,
      });
      expect(service.deleteUserById).toHaveBeenCalledWith('user-1', false);
    });
  });
});
