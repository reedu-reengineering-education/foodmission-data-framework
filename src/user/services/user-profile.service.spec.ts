import { Test, TestingModule } from '@nestjs/testing';
import { UserProfileService } from './user-profile.service';
import { UserRepository } from '../repositories/user.repository';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UserProfileService - deleteUserById', () => {
  let service: UserProfileService;
  let userRepository: jest.Mocked<UserRepository>;
  let prisma: jest.Mocked<PrismaService>;

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
    const mockRepo: Partial<jest.Mocked<UserRepository>> = {
      findByKeycloakId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockPrisma: Partial<jest.Mocked<PrismaService>> = {
      mealLog: {
        deleteMany: jest.fn(),
      } as any,
      meal: {
        deleteMany: jest.fn(),
      } as any,
      recipe: {
        deleteMany: jest.fn(),
      } as any,
      pantryItem: {
        deleteMany: jest.fn(),
      } as any,
      pantry: {
        deleteMany: jest.fn(),
      } as any,
      shoppingListItem: {
        deleteMany: jest.fn(),
      } as any,
      shoppingList: {
        deleteMany: jest.fn(),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        {
          provide: UserRepository,
          useValue: mockRepo,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
    userRepository = module.get(UserRepository);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteUserById without cascade', () => {
    it('should delete only user record when cascade is false', async () => {
      (userRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await service.deleteUserById('user-1', false);

      expect(userRepository.remove).toHaveBeenCalledWith('user-1');
      expect(prisma.mealLog.deleteMany).not.toHaveBeenCalled();
      expect(prisma.meal.deleteMany).not.toHaveBeenCalled();
      expect(prisma.recipe.deleteMany).not.toHaveBeenCalled();
      expect(prisma.pantryItem.deleteMany).not.toHaveBeenCalled();
      expect(prisma.pantry.deleteMany).not.toHaveBeenCalled();
      expect(prisma.shoppingListItem.deleteMany).not.toHaveBeenCalled();
      expect(prisma.shoppingList.deleteMany).not.toHaveBeenCalled();
    });

    it('should delete only user record when cascade is not provided (default)', async () => {
      (userRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await service.deleteUserById('user-1');

      expect(userRepository.remove).toHaveBeenCalledWith('user-1');
      expect(prisma.mealLog.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('deleteUserById with cascade', () => {
    it('should delete all related data when cascade is true', async () => {
      (prisma.mealLog.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
      (prisma.meal.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });
      (prisma.recipe.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.pantryItem.deleteMany as jest.Mock).mockResolvedValue({
        count: 10,
      });
      (prisma.pantry.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValue({
        count: 8,
      });
      (prisma.shoppingList.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (userRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await service.deleteUserById('user-1', true);

      // Verify all related entities are deleted in correct order
      expect(prisma.mealLog.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.meal.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.recipe.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.pantryItem.deleteMany).toHaveBeenCalledWith({
        where: { pantry: { userId: 'user-1' } },
      });
      expect(prisma.pantry.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.shoppingListItem.deleteMany).toHaveBeenCalledWith({
        where: { shoppingList: { userId: 'user-1' } },
      });
      expect(prisma.shoppingList.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });

      // Verify user is deleted last
      expect(userRepository.remove).toHaveBeenCalledWith('user-1');
    });

    it('should delete user even if there are no related records', async () => {
      (prisma.mealLog.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.meal.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.recipe.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.pantryItem.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prisma.pantry.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prisma.shoppingList.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (userRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await service.deleteUserById('user-1', true);

      expect(userRepository.remove).toHaveBeenCalledWith('user-1');
    });

    it('should propagate errors from Prisma operations', async () => {
      const error = new Error('Database constraint violation');
      (prisma.mealLog.deleteMany as jest.Mock).mockRejectedValue(error);

      await expect(service.deleteUserById('user-1', true)).rejects.toThrow(
        'Database constraint violation',
      );

      // Verify user was not deleted if cascade deletion fails
      expect(userRepository.remove).not.toHaveBeenCalled();
    });

    it('should propagate errors from user deletion', async () => {
      (prisma.mealLog.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.meal.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.recipe.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.pantryItem.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prisma.pantry.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prisma.shoppingList.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const error = new Error('User not found');
      (userRepository.remove as jest.Mock).mockRejectedValue(error);

      await expect(service.deleteUserById('user-1', true)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('other UserProfileService methods', () => {
    it('should get user ID from keycloak ID', async () => {
      (userRepository.findByKeycloakId as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const result = await service.getUserIdFromKeycloakId('kc-1');

      expect(result).toBe('user-1');
      expect(userRepository.findByKeycloakId).toHaveBeenCalledWith('kc-1');
    });

    it('should throw NotFoundException when user not found by keycloak ID', async () => {
      (userRepository.findByKeycloakId as jest.Mock).mockResolvedValue(null);

      await expect(service.getUserIdFromKeycloakId('kc-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
