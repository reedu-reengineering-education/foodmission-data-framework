import { Test, TestingModule } from '@nestjs/testing';
import { UserProfilesController } from './user-profiles.controller';
import { UserProfilesService } from '../services/user-profiles.service';
import { NotFoundException } from '@nestjs/common';
import {
  ActivityLevel,
  AnnualIncomeLevel,
  EducationLevel,
} from '../dto/create-user.dto';
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
    gender: 'male',
    annualIncome: AnnualIncomeLevel.FROM_50000_TO_74999,
    educationLevel: EducationLevel.BACHELORS,
    weightKg: 75,
    heightCm: 180,
    activityLevel: ActivityLevel.MODERATE,
    healthGoals: {},
    nutritionTargets: {},
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
        {
          provide: UserProfilesService,
          useValue: mockService,
        },
        {
          provide: GamificationProfileService,
          useValue: gamificationProfileService,
        },
      ],
    })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserProfilesController>(UserProfilesController);
    service = module.get(UserProfilesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should return true if profile is complete', async () => {
      service.getProfileByUserId.mockResolvedValue(mockUserProfile);
      service.isBasicProfileComplete.mockResolvedValue(true);

      const result = await controller.getMyProfile('user-1');

      expect(result).toBe(true);
      expect(service.getProfileByUserId).toHaveBeenCalledWith('user-1');
      expect(service.isBasicProfileComplete).toHaveBeenCalledWith('kc-1');
    });

    it('should return false if profile is incomplete', async () => {
      service.getProfileByUserId.mockResolvedValue(mockUserProfile);
      service.isBasicProfileComplete.mockResolvedValue(false);

      const result = await controller.getMyProfile('user-1');

      expect(result).toBe(false);
      expect(service.getProfileByUserId).toHaveBeenCalledWith('user-1');
      expect(service.isBasicProfileComplete).toHaveBeenCalledWith('kc-1');
    });

    it('should return false if user not found', async () => {
      service.getProfileByUserId.mockResolvedValue(null);

      const result = await controller.getMyProfile('user-1');

      expect(result).toBe(false);
      expect(service.getProfileByUserId).toHaveBeenCalledWith('user-1');
      expect(service.isBasicProfileComplete).not.toHaveBeenCalled();
    });
  });

  describe('getMyGamificationProfile', () => {
    it('should delegate to GamificationProfileService', async () => {
      const profile = {
        userId: 'user-1',
        segment: null,
        currentQuestId: null,
        lastLoginAt: null,
        preferences: {
          onboardingSurvey: {},
        },
        wallet: null,
        progressIndicators: [],
        badges: [],
        recentEvents: [],
        recentWalletEntries: [],
      };
      gamificationProfileService.getProfileForUserId.mockResolvedValue(profile);

      const result = await controller.getMyGamificationProfile('user-1', {
        eventsLimit: 5,
        walletEntriesLimit: 10,
      });

      expect(result).toEqual(profile);
      expect(
        gamificationProfileService.getProfileForUserId,
      ).toHaveBeenCalledWith('user-1', {
        eventsLimit: 5,
        walletEntriesLimit: 10,
      });
    });
  });

  describe('updateProfile', () => {
    it('should update profile with valid data', async () => {
      const updateDto = {
        country: 'DE',
        region: 'BE',
        zip: '10115',
        language: 'de',
      };

      service.getProfileByUserId.mockResolvedValue(mockUserProfile);
      service.updateProfile.mockResolvedValue({
        ...mockUserProfile,
        ...updateDto,
      });

      const result = await controller.updateProfile('user-1', updateDto);

      expect(result.country).toBe('DE');
      expect(service.updateProfile).toHaveBeenCalledWith('kc-1', updateDto);
    });

    it('should throw NotFoundException if user not found', async () => {
      service.getProfileByUserId.mockResolvedValue(null);

      await expect(
        controller.updateProfile('user-1', {} as any),
      ).rejects.toThrow(NotFoundException);
      expect(service.updateProfile).not.toHaveBeenCalled();
    });

    it('should return user if no changes provided', async () => {
      service.getProfileByUserId.mockResolvedValue(mockUserProfile);

      const result = await controller.updateProfile('user-1', {});

      expect(result).toEqual(mockUserProfile);
      expect(service.updateProfile).not.toHaveBeenCalled();
    });

    it('should filter out undefined values', async () => {
      const updateDto = {
        country: 'DE',
        region: undefined,
        zip: '10115',
      };

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

    it('should update settings', async () => {
      const updateDto = {
        settings: {
          notificationsEnabled: true,
          notificationPreferredTime: '10:00',
        },
      } as ProfileUpdateDto;

      service.getProfileByUserId.mockResolvedValue(mockUserProfile);
      service.updateProfile.mockResolvedValue({
        ...mockUserProfile,
        settings: updateDto.settings as Record<string, unknown>,
      });

      const result = await controller.updateProfile('user-1', updateDto);

      expect(result.settings).toEqual(updateDto.settings);
      expect(service.updateProfile).toHaveBeenCalledWith('kc-1', updateDto);
    });

    it('should update preferences', async () => {
      const updateDto = {
        preferences: {
          foodExclusions: ['peanuts'],
          motivation: 'SUSTAINABLE_HABITS',
          showNutriScore: true,
        },
      } as ProfileUpdateDto;

      service.getProfileByUserId.mockResolvedValue(mockUserProfile);
      service.updateProfile.mockResolvedValue({
        ...mockUserProfile,
        preferences: updateDto.preferences as Record<string, unknown>,
      });

      const result = await controller.updateProfile('user-1', updateDto);

      expect(result.preferences).toEqual(updateDto.preferences);
      expect(service.updateProfile).toHaveBeenCalledWith('kc-1', updateDto);
    });

    it('should update gamification onboarding baselines', async () => {
      const updateDto = {
        preferences: {
          onboardingSurvey: {
            weeklyMeatConsumption: 'ZERO_TO_FOUR',
            weeklyBeefConsumption: 'NEVER',
            weeklyFoodWaste: 'ONE_TO_TWO',
            weeklyUpfConsumption: 'ZERO_TO_THREE',
            weeklyReusableOrRefill: 'THREE_TO_SIX',
          },
        },
        segment: 'BEGINNER',
      } as ProfileUpdateDto;

      service.getProfileByUserId.mockResolvedValue(mockUserProfile);
      service.updateProfile.mockResolvedValue({
        ...mockUserProfile,
        preferences: updateDto.preferences as Record<string, unknown>,
        segment: 'BEGINNER',
      });

      const result = await controller.updateProfile('user-1', updateDto);

      expect(result.preferences?.onboardingSurvey).toEqual(
        updateDto.preferences?.onboardingSurvey,
      );
      expect(result.segment).toBe('BEGINNER');
      expect(service.updateProfile).toHaveBeenCalledWith('kc-1', updateDto);
    });
  });

  describe('deleteMe', () => {
    it('should delete user without cascade by default', async () => {
      service.deleteUserById.mockResolvedValue(undefined);

      const result = await controller.deleteMe('user-1', 'false');

      expect(result).toEqual({ deleted: true, cascade: false });
      expect(service.deleteUserById).toHaveBeenCalledWith('user-1', false);
    });

    it('should delete user without cascade when deleteAll is explicitly false', async () => {
      service.deleteUserById.mockResolvedValue(undefined);

      const result = await controller.deleteMe('user-1', 'false');

      expect(result).toEqual({ deleted: true, cascade: false });
      expect(service.deleteUserById).toHaveBeenCalledWith('user-1', false);
    });

    it('should delete user with cascade when deleteAll is true', async () => {
      service.deleteUserById.mockResolvedValue(undefined);

      const result = await controller.deleteMe('user-1', 'true');

      expect(result).toEqual({ deleted: true, cascade: true });
      expect(service.deleteUserById).toHaveBeenCalledWith('user-1', true);
    });

    it('should treat any non-"true" value as false', async () => {
      service.deleteUserById.mockResolvedValue(undefined);

      const result = await controller.deleteMe('user-1', 'yes');

      expect(result).toEqual({ deleted: true, cascade: false });
      expect(service.deleteUserById).toHaveBeenCalledWith('user-1', false);
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Database error');
      service.deleteUserById.mockRejectedValue(error);

      await expect(controller.deleteMe('user-1', 'false')).rejects.toThrow(
        'Database error',
      );
    });
  });
});
