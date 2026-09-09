import { Test, TestingModule } from '@nestjs/testing';
import { UserProfilesController } from './user-profiles.controller';
import { UserProfilesService } from '../services/user-profiles.service';
import { NotFoundException } from '@nestjs/common';
import { ProfileUpdateDto } from '../dto/profile-update.dto';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { GamificationProfileService } from '../../gamification/services/gamification-profile.service';
import { ProgressWheelService } from '../../gamification/services/progress-wheel.service';
import { OnboardingSurveyService } from '../../gamification/services/onboarding-survey.service';

describe('UserProfilesController', () => {
  let controller: UserProfilesController;
  let service: jest.Mocked<UserProfilesService>;
  let gamificationProfileService: jest.Mocked<
    Pick<GamificationProfileService, 'getProfileForUserId'>
  >;
  let progressWheelService: jest.Mocked<
    Pick<ProgressWheelService, 'getWheelsForUser' | 'recordImpact'>
  >;
  let onboardingSurveyService: jest.Mocked<
    Pick<OnboardingSurveyService, 'getSurveyQuestions' | 'submitSurvey'>
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
    gamificationProfileService = {
      getProfileForUserId: jest.fn(),
    };
    progressWheelService = {
      getWheelsForUser: jest.fn(),
      recordImpact: jest.fn(),
    };
    onboardingSurveyService = {
      getSurveyQuestions: jest.fn().mockReturnValue([]),
      submitSurvey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProfilesController],
      providers: [
        {
          provide: UserProfilesService,
          useValue: {
            getProfileByUserId: jest.fn(),
            updateProfile: jest.fn(),
            isBasicProfileComplete: jest.fn(),
            deleteUserById: jest.fn(),
          },
        },
        {
          provide: GamificationProfileService,
          useValue: gamificationProfileService,
        },
        {
          provide: ProgressWheelService,
          useValue: progressWheelService,
        },
        {
          provide: OnboardingSurveyService,
          useValue: onboardingSurveyService,
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
    });

    it('returns false when user is missing', async () => {
      service.getProfileByUserId.mockResolvedValue(null);

      await expect(controller.getMyProfile('user-1')).resolves.toBe(false);
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
  });

  describe('recordProgressWheelImpact', () => {
    it('delegates to ProgressWheelService', async () => {
      const result = {
        actionCode: 'VEGETARIAN_SERVING_100G',
        wheels: [],
        achievements: [],
      } as any;
      progressWheelService.recordImpact.mockResolvedValue(result);

      await expect(
        controller.recordProgressWheelImpact('user-1', {
          actionCode: 'VEGETARIAN_SERVING_100G',
        }),
      ).resolves.toEqual(result);
      expect(progressWheelService.recordImpact).toHaveBeenCalledWith(
        'user-1',
        'VEGETARIAN_SERVING_100G',
      );
    });
  });

  describe('getOnboardingSurvey', () => {
    it('returns the survey questions wrapped in { questions }', () => {
      const questions = [
        { field: 'weeklyMeatConsumption', text: 'q1', options: [] },
      ] as any;
      onboardingSurveyService.getSurveyQuestions.mockReturnValue(questions);

      expect(controller.getOnboardingSurvey()).toEqual({ questions });
    });
  });

  describe('submitOnboardingSurvey', () => {
    it('delegates to OnboardingSurveyService', async () => {
      const answers = {
        weeklyMeatConsumption: 'ZERO_TO_FOUR',
        weeklyBeefConsumption: 'NEVER',
        weeklyFoodWaste: 'ZERO',
        weeklyUpfConsumption: 'ZERO_TO_THREE',
        weeklyReusableOrRefill: 'TEN_PLUS',
      } as any;
      const result = { segment: 'ADVANCED', progressWheels: [] } as any;
      onboardingSurveyService.submitSurvey.mockResolvedValue(result);

      await expect(
        controller.submitOnboardingSurvey('user-1', answers),
      ).resolves.toEqual(result);
      expect(onboardingSurveyService.submitSurvey).toHaveBeenCalledWith(
        'user-1',
        answers,
      );
    });
  });
});
