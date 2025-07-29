import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    keycloakId: 'keycloak-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when found by keycloakId', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await service.validateUser('keycloak-123', 'test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { keycloakId: 'keycloak-123' },
      });
    });

    it('should find user by email when not found by keycloakId', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // First call by keycloakId
        .mockResolvedValueOnce(mockUser); // Second call by email

      const result = await service.validateUser('keycloak-123', 'test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.user.findUnique).toHaveBeenNthCalledWith(1, {
        where: { keycloakId: 'keycloak-123' },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenNthCalledWith(2, {
        where: { email: 'test@example.com' },
      });
    });

    it('should update keycloakId when user found by email but keycloakId differs', async () => {
      const userWithDifferentKeycloakId = { ...mockUser, keycloakId: 'old-keycloak-id' };
      const updatedUser = { ...mockUser, keycloakId: 'keycloak-123' };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // First call by keycloakId
        .mockResolvedValueOnce(userWithDifferentKeycloakId); // Second call by email
      
      mockPrismaService.user.update.mockResolvedValueOnce(updatedUser);

      const result = await service.validateUser('keycloak-123', 'test@example.com');

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { keycloakId: 'keycloak-123' },
      });
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should return null when database error occurs', async () => {
      mockPrismaService.user.findUnique.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.validateUser('keycloak-123', 'test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('createUserFromKeycloak', () => {
    const userData = {
      keycloakId: 'keycloak-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should create user successfully', async () => {
      mockPrismaService.user.create.mockResolvedValueOnce(mockUser);

      const result = await service.createUserFromKeycloak(userData);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: userData,
      });
    });

    it('should throw UnauthorizedException when creation fails', async () => {
      mockPrismaService.user.create.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.createUserFromKeycloak(userData)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('ensureUserExists', () => {
    const userData = {
      keycloakId: 'keycloak-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should return existing user when found', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValueOnce(mockUser);

      const result = await service.ensureUserExists(
        userData.keycloakId,
        userData.email,
        userData.firstName,
        userData.lastName,
      );

      expect(result).toEqual(mockUser);
      expect(service.validateUser).toHaveBeenCalledWith(userData.keycloakId, userData.email);
    });

    it('should create new user when not found', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValueOnce(null);
      jest.spyOn(service, 'createUserFromKeycloak').mockResolvedValueOnce(mockUser);

      const result = await service.ensureUserExists(
        userData.keycloakId,
        userData.email,
        userData.firstName,
        userData.lastName,
      );

      expect(result).toEqual(mockUser);
      expect(service.validateUser).toHaveBeenCalledWith(userData.keycloakId, userData.email);
      expect(service.createUserFromKeycloak).toHaveBeenCalledWith(userData);
    });
  });
});