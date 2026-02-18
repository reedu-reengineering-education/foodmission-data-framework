import { Test, TestingModule } from '@nestjs/testing';
import { UserProfileController } from './user-profile.controller';
import { UserProfileService } from '../services/user-profile.service';
import { NotFoundException } from '@nestjs/common';
import {
  ActivityLevel,
  AnnualIncomeLevel,
  EducationLevel,
} from '../dto/create-user.dto';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

describe('UserProfileController', () => {
  let controller: UserProfileController;
  let service: jest.Mocked<UserProfileService>;

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
    const mockService: Partial<jest.Mocked<UserProfileService>> = {
      getProfileByUserId: jest.fn(),
      updateProfile: jest.fn(),
      isBasicProfileComplete: jest.fn(),
      deleteUserById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProfileController],
      providers: [
        {
          provide: UserProfileService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserProfileController>(UserProfileController);
    service = module.get(UserProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should return user profile', async () => {
      service.getProfileByUserId.mockResolvedValue(mockUserProfile);

      const result = await controller.getMyProfile('user-1');

      expect(result).toEqual(mockUserProfile);
      expect(service.getProfileByUserId).toHaveBeenCalledWith('user-1');
    });

    it('should return null if user not found', async () => {
      service.getProfileByUserId.mockResolvedValue(null);

      const result = await controller.getMyProfile('user-1');

      expect(result).toBeNull();
      expect(service.getProfileByUserId).toHaveBeenCalledWith('user-1');
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

      const result = await controller.updateProfile('user-1', updateDto as any);

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

      const result = await controller.updateProfile('user-1', {} as any);

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

      await controller.updateProfile('user-1', updateDto as any);

      expect(service.updateProfile).toHaveBeenCalledWith('kc-1', {
        country: 'DE',
        zip: '10115',
      });
    });
  });

  describe('isComplete', () => {
    it('should return complete true if profile is complete', async () => {
      service.getProfileByUserId.mockResolvedValue(mockUserProfile);
      service.isBasicProfileComplete.mockResolvedValue(true);

      const result = await controller.isComplete('user-1');

      expect(result).toEqual({ complete: true });
      expect(service.isBasicProfileComplete).toHaveBeenCalledWith('kc-1');
    });

    it('should return complete false if profile is incomplete', async () => {
      service.getProfileByUserId.mockResolvedValue(mockUserProfile);
      service.isBasicProfileComplete.mockResolvedValue(false);

      const result = await controller.isComplete('user-1');

      expect(result).toEqual({ complete: false });
    });

    it('should return complete false if user not found', async () => {
      service.getProfileByUserId.mockResolvedValue(null);

      const result = await controller.isComplete('user-1');

      expect(result).toEqual({ complete: false });
      expect(service.isBasicProfileComplete).not.toHaveBeenCalled();
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
