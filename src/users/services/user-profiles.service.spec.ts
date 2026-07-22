import { Test, TestingModule } from '@nestjs/testing';
import { UserProfilesService } from './user-profiles.service';
import { UsersRepository } from '../repositories/users.repository';
import { PrismaService } from '../../database/prisma.service';
import { KeycloakAdminService } from '../../keycloak-admin/keycloak-admin.service';
import { NotFoundException } from '@nestjs/common';
import { GamificationOnboardingService } from '../../gamification/services/gamification-onboarding.service';
import {
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';

describe('UserProfilesService', () => {
  let service: UserProfilesService;
  let userRepository: jest.Mocked<UsersRepository>;
  let prisma: jest.Mocked<PrismaService>;
  let keycloakAdminService: jest.Mocked<KeycloakAdminService>;
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
    const mockRepo: Partial<jest.Mocked<UsersRepository>> = {
      findByKeycloakId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockPrisma: Partial<jest.Mocked<PrismaService>> = {
      user: { update: jest.fn() } as any,
      mealLog: { deleteMany: jest.fn() } as any,
      meal: { deleteMany: jest.fn() } as any,
      recipe: { deleteMany: jest.fn() } as any,
      pantryItem: { deleteMany: jest.fn() } as any,
      pantry: { deleteMany: jest.fn() } as any,
      shoppingListItem: { deleteMany: jest.fn() } as any,
      shoppingList: { deleteMany: jest.fn() } as any,
    };

    const mockKeycloakAdmin: Partial<jest.Mocked<KeycloakAdminService>> = {
      deleteUser: jest.fn().mockResolvedValue(undefined),
    };

    const mockOnboarding: Partial<jest.Mocked<GamificationOnboardingService>> =
      {
        applyOnboardingSideEffects: jest.fn().mockResolvedValue({
          segment: UserSegment.BEGINNER,
          indicatorsSeeded: 7,
          walletEnsured: true,
          onboardingEventRecorded: true,
          skipped: false,
        }),
      };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfilesService,
        { provide: UsersRepository, useValue: mockRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: KeycloakAdminService, useValue: mockKeycloakAdmin },
        { provide: GamificationOnboardingService, useValue: mockOnboarding },
      ],
    }).compile();

    service = module.get(UserProfilesService);
    userRepository = module.get(UsersRepository);
    prisma = module.get(PrismaService);
    keycloakAdminService = module.get(KeycloakAdminService);
    gamificationOnboarding = module.get(GamificationOnboardingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteUserById', () => {
    it('deletes only the user when cascade is false', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await service.deleteUserById('user-1', false);

      expect(userRepository.remove).toHaveBeenCalledWith('user-1');
      expect(keycloakAdminService.deleteUser).toHaveBeenCalledWith('kc-1');
      expect(prisma.mealLog.deleteMany).not.toHaveBeenCalled();
    });

    it('cascades related data when cascade is true', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (prisma.mealLog.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.meal.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.recipe.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.pantryItem.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.pantry.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.shoppingList.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (userRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await service.deleteUserById('user-1', true);

      expect(prisma.mealLog.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(userRepository.remove).toHaveBeenCalledWith('user-1');
      expect(keycloakAdminService.deleteUser).toHaveBeenCalledWith('kc-1');
    });

    it('throws when user is missing', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteUserById('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(userRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile gamification onboarding', () => {
    it('derives segment and applies side effects when all baselines are set', async () => {
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
      const afterSegment = {
        ...afterUpdate,
        segment: UserSegment.BEGINNER,
      };

      (prisma.user.update as jest.Mock)
        .mockResolvedValueOnce(afterUpdate)
        .mockResolvedValueOnce(afterSegment);

      const result = await service.updateProfile('kc-1', {
        preferences: {
          onboardingSurvey: {
            weeklyMeatConsumption: WeeklyMeatRange.FIFTEEN_PLUS,
            weeklyBeefConsumption:
              WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK,
            weeklyFoodWaste: WeeklyFoodWasteRange.FIVE_PLUS,
            weeklyUpfConsumption: WeeklyUpfRange.FIFTEEN_PLUS,
            weeklyReusableOrRefill: WeeklyReusableRange.ZERO_TO_TWO,
          },
        },
      });

      expect(
        gamificationOnboarding.applyOnboardingSideEffects,
      ).toHaveBeenCalledWith(afterSegment, UserSegment.BEGINNER);
      expect(result.segment).toBe(UserSegment.BEGINNER);
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
});
