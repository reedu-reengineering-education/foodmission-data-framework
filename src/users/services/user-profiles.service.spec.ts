import { Test, TestingModule } from '@nestjs/testing';
import { UserProfilesService } from './user-profiles.service';
import { UsersRepository } from '../repositories/users.repository';
import { PrismaService } from '../../database/prisma.service';
import { KeycloakAdminService } from '../../keycloak-admin/keycloak-admin.service';
import { GamificationOnboardingService } from '../../gamification/services/gamification-onboarding.service';
import {
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';

describe('UserProfilesService updateProfile gamification', () => {
  let service: UserProfilesService;
  let userRepository: jest.Mocked<UsersRepository>;
  let prisma: jest.Mocked<PrismaService>;
  let gamificationOnboarding: jest.Mocked<GamificationOnboardingService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    keycloakId: 'kc-1',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    yearOfBirth: 1990,
    country: 'US',
    region: 'CA',
    zip: '12345',
    language: 'en',
    preferences: {},
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfilesService,
        {
          provide: UsersRepository,
          useValue: {
            findByKeycloakId: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: { user: { update: jest.fn() } },
        },
        {
          provide: KeycloakAdminService,
          useValue: { deleteUser: jest.fn() },
        },
        {
          provide: GamificationOnboardingService,
          useValue: {
            applyOnboardingSideEffects: jest.fn().mockResolvedValue({
              segment: UserSegment.BEGINNER,
              indicatorsSeeded: 7,
              walletEnsured: true,
              onboardingEventRecorded: true,
              skipped: false,
            }),
          },
        },
      ],
    }).compile();

    service = module.get(UserProfilesService);
    userRepository = module.get(UsersRepository);
    prisma = module.get(PrismaService);
    gamificationOnboarding = module.get(GamificationOnboardingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('applies side effects when baselines and client-chosen segment are set', async () => {
    (userRepository.findByKeycloakId as jest.Mock).mockResolvedValue({
      ...mockUser,
      weeklyMeatConsumption: null,
      weeklyBeefConsumption: null,
      weeklyFoodWaste: null,
      weeklyUpfConsumption: null,
      weeklyReusableOrRefill: null,
      segment: null,
    });

    const afterUpdate = {
      ...mockUser,
      weeklyMeatConsumption: WeeklyMeatRange.FIFTEEN_PLUS,
      weeklyBeefConsumption: WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK,
      weeklyFoodWaste: WeeklyFoodWasteRange.FIVE_PLUS,
      weeklyUpfConsumption: WeeklyUpfRange.FIFTEEN_PLUS,
      weeklyReusableOrRefill: WeeklyReusableRange.ZERO_TO_TWO,
      segment: UserSegment.BEGINNER,
    };

    (prisma.user.update as jest.Mock).mockResolvedValueOnce(afterUpdate);

    const result = await service.updateProfile('kc-1', {
      segment: UserSegment.BEGINNER,
      preferences: {
        onboardingSurvey: {
          weeklyMeatConsumption: WeeklyMeatRange.FIFTEEN_PLUS,
          weeklyBeefConsumption: WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK,
          weeklyFoodWaste: WeeklyFoodWasteRange.FIVE_PLUS,
          weeklyUpfConsumption: WeeklyUpfRange.FIFTEEN_PLUS,
          weeklyReusableOrRefill: WeeklyReusableRange.ZERO_TO_TWO,
        },
      },
    });

    expect(
      gamificationOnboarding.applyOnboardingSideEffects,
    ).toHaveBeenCalledWith(afterUpdate, UserSegment.BEGINNER);
    expect(result.segment).toBe(UserSegment.BEGINNER);
  });

  it('does not apply side effects when baselines are set without a segment', async () => {
    (userRepository.findByKeycloakId as jest.Mock).mockResolvedValue({
      ...mockUser,
      weeklyMeatConsumption: null,
      weeklyBeefConsumption: null,
      weeklyFoodWaste: null,
      weeklyUpfConsumption: null,
      weeklyReusableOrRefill: null,
      segment: null,
    });

    const afterUpdate = {
      ...mockUser,
      weeklyMeatConsumption: WeeklyMeatRange.FIFTEEN_PLUS,
      weeklyBeefConsumption: WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK,
      weeklyFoodWaste: WeeklyFoodWasteRange.FIVE_PLUS,
      weeklyUpfConsumption: WeeklyUpfRange.FIFTEEN_PLUS,
      weeklyReusableOrRefill: WeeklyReusableRange.ZERO_TO_TWO,
      segment: null,
    };

    (prisma.user.update as jest.Mock).mockResolvedValueOnce(afterUpdate);

    const result = await service.updateProfile('kc-1', {
      preferences: {
        onboardingSurvey: {
          weeklyMeatConsumption: WeeklyMeatRange.FIFTEEN_PLUS,
          weeklyBeefConsumption: WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK,
          weeklyFoodWaste: WeeklyFoodWasteRange.FIVE_PLUS,
          weeklyUpfConsumption: WeeklyUpfRange.FIFTEEN_PLUS,
          weeklyReusableOrRefill: WeeklyReusableRange.ZERO_TO_TWO,
        },
      },
    });

    expect(
      gamificationOnboarding.applyOnboardingSideEffects,
    ).not.toHaveBeenCalled();
    expect(result.segment).toBeNull();
  });
  it('merges partial preferences and settings without wiping stored keys', async () => {
    (userRepository.findByKeycloakId as jest.Mock).mockResolvedValue({
      ...mockUser,
      preferences: {
        motivation: 'HEALTH',
        foodExclusions: ['peanuts'],
      },
      settings: {
        emailNotifications: true,
      },
    });

    (prisma.user.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        ...mockUser,
        ...data,
        preferences: data.preferences,
        settings: data.settings,
      }),
    );

    await service.updateProfile('kc-1', {
      preferences: {
        onboardingSurvey: {
          weeklyMeatConsumption: WeeklyMeatRange.FIVE_TO_NINE,
        },
      },
      settings: {
        pushNotifications: false,
      },
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          preferences: {
            motivation: 'HEALTH',
            foodExclusions: ['peanuts'],
          },
          weeklyMeatConsumption: WeeklyMeatRange.FIVE_TO_NINE,
          settings: {
            emailNotifications: true,
            pushNotifications: false,
          },
        }),
      }),
    );
  });
});
