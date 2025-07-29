/**
 * User Integration Tests
 * Tests user database operations and repository layer
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { UserRepository } from '../src/user/repositories/user.repository';
import { UserPreferencesRepository } from '../src/user/repositories/user-preferences.repository';
import { CreateUserDto } from '../src/user/dto/create-user.dto';
import { UpdateUserDto } from '../src/user/dto/update-user.dto';
import { UserPreferencesDto } from '../src/user/dto/user-preferences.dto';

describe('User Integration Tests', () => {
  let prisma: PrismaService;
  let userRepository: UserRepository;
  let userPreferencesRepository: UserPreferencesRepository;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        UserRepository,
        UserPreferencesRepository,
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    userRepository = module.get<UserRepository>(UserRepository);
    userPreferencesRepository = module.get<UserPreferencesRepository>(UserPreferencesRepository);
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.userPreferences.deleteMany({
      where: {
        user: {
          email: {
            contains: 'integration-test',
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'integration-test',
        },
      },
    });
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.userPreferences.deleteMany({
      where: {
        user: {
          email: {
            contains: 'integration-test',
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'integration-test',
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('UserRepository', () => {
    describe('create', () => {
      it('should create a new user', async () => {
        const createDto: CreateUserDto = {
          keycloakId: 'integration-test-keycloak-1',
          email: 'integration-test-1@example.com',
          firstName: 'Integration',
          lastName: 'Test1',
        };

        const result = await userRepository.create(createDto);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.keycloakId).toBe(createDto.keycloakId);
        expect(result.email).toBe(createDto.email);
        expect(result.firstName).toBe(createDto.firstName);
        expect(result.lastName).toBe(createDto.lastName);
        expect(result.createdAt).toBeValidDate();
        expect(result.updatedAt).toBeValidDate();
      });
    });

    describe('findById', () => {
      it('should find user by id with preferences', async () => {
        const createDto: CreateUserDto = {
          keycloakId: 'integration-test-keycloak-2',
          email: 'integration-test-2@example.com',
          firstName: 'Integration',
          lastName: 'Test2',
        };

        const created = await userRepository.create(createDto);
        const found = await userRepository.findById(created.id);

        expect(found).toBeDefined();
        expect(found!.id).toBe(created.id);
        expect(found!.email).toBe(created.email);
        expect(found!.preferences).toBeNull(); // No preferences created yet
      });

      it('should return null for non-existent id', async () => {
        const found = await userRepository.findById('non-existent-id');
        expect(found).toBeNull();
      });
    });

    describe('findByKeycloakId', () => {
      it('should find user by keycloak id', async () => {
        const keycloakId = 'integration-test-keycloak-3';
        const createDto: CreateUserDto = {
          keycloakId,
          email: 'integration-test-3@example.com',
          firstName: 'Integration',
          lastName: 'Test3',
        };

        await userRepository.create(createDto);
        const found = await userRepository.findByKeycloakId(keycloakId);

        expect(found).toBeDefined();
        expect(found!.keycloakId).toBe(keycloakId);
      });

      it('should return null for non-existent keycloak id', async () => {
        const found = await userRepository.findByKeycloakId('non-existent-keycloak-id');
        expect(found).toBeNull();
      });
    });

    describe('findByEmail', () => {
      it('should find user by email', async () => {
        const email = 'integration-test-4@example.com';
        const createDto: CreateUserDto = {
          keycloakId: 'integration-test-keycloak-4',
          email,
          firstName: 'Integration',
          lastName: 'Test4',
        };

        await userRepository.create(createDto);
        const found = await userRepository.findByEmail(email);

        expect(found).toBeDefined();
        expect(found!.email).toBe(email);
      });

      it('should return null for non-existent email', async () => {
        const found = await userRepository.findByEmail('non-existent@example.com');
        expect(found).toBeNull();
      });
    });

    describe('update', () => {
      it('should update user information', async () => {
        const createDto: CreateUserDto = {
          keycloakId: 'integration-test-keycloak-5',
          email: 'integration-test-5@example.com',
          firstName: 'Original',
          lastName: 'Name',
        };

        const created = await userRepository.create(createDto);
        
        const updateDto: UpdateUserDto = {
          firstName: 'Updated',
          lastName: 'Name',
        };

        const updated = await userRepository.update(created.id, updateDto);

        expect(updated).toBeDefined();
        expect(updated.firstName).toBe(updateDto.firstName);
        expect(updated.lastName).toBe(updateDto.lastName);
        expect(updated.email).toBe(created.email); // Unchanged
        expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
      });
    });

    describe('delete', () => {
      it('should delete user', async () => {
        const createDto: CreateUserDto = {
          keycloakId: 'integration-test-keycloak-6',
          email: 'integration-test-6@example.com',
          firstName: 'To Be',
          lastName: 'Deleted',
        };

        const created = await userRepository.create(createDto);
        await userRepository.delete(created.id);

        const found = await userRepository.findById(created.id);
        expect(found).toBeNull();
      });
    });
  });

  describe('UserPreferencesRepository', () => {
    let testUser: any;

    beforeEach(async () => {
      // Create a test user for preferences tests
      testUser = await userRepository.create({
        keycloakId: 'integration-test-preferences-user',
        email: 'integration-test-preferences@example.com',
        firstName: 'Preferences',
        lastName: 'Test',
      });
    });

    describe('create', () => {
      it('should create user preferences', async () => {
        const preferencesDto: UserPreferencesDto = {
          dietaryRestrictions: ['vegetarian', 'gluten-free'],
          allergies: ['nuts', 'dairy'],
          preferredCategories: ['Fruits', 'Vegetables'],
        };

        const result = await userPreferencesRepository.create(testUser.id, preferencesDto);

        expect(result).toBeDefined();
        expect(result.userId).toBe(testUser.id);
        expect(result.dietaryRestrictions).toEqual(preferencesDto.dietaryRestrictions);
        expect(result.allergies).toEqual(preferencesDto.allergies);
        expect(result.preferredCategories).toEqual(preferencesDto.preferredCategories);
      });
    });

    describe('findByUserId', () => {
      it('should find preferences by user id', async () => {
        const preferencesDto: UserPreferencesDto = {
          dietaryRestrictions: ['vegan'],
          allergies: ['shellfish'],
          preferredCategories: ['Proteins'],
        };

        await userPreferencesRepository.create(testUser.id, preferencesDto);
        const found = await userPreferencesRepository.findByUserId(testUser.id);

        expect(found).toBeDefined();
        expect(found!.userId).toBe(testUser.id);
        expect(found!.dietaryRestrictions).toEqual(preferencesDto.dietaryRestrictions);
        expect(found!.allergies).toEqual(preferencesDto.allergies);
        expect(found!.preferredCategories).toEqual(preferencesDto.preferredCategories);
      });

      it('should return null for user without preferences', async () => {
        const found = await userPreferencesRepository.findByUserId(testUser.id);
        expect(found).toBeNull();
      });
    });

    describe('update', () => {
      it('should update user preferences', async () => {
        const initialPreferences: UserPreferencesDto = {
          dietaryRestrictions: ['vegetarian'],
          allergies: ['nuts'],
          preferredCategories: ['Fruits'],
        };

        await userPreferencesRepository.create(testUser.id, initialPreferences);

        const updatePreferences: UserPreferencesDto = {
          dietaryRestrictions: ['vegan'],
          allergies: ['nuts', 'dairy'],
          preferredCategories: ['Fruits', 'Vegetables'],
        };

        const updated = await userPreferencesRepository.update(testUser.id, updatePreferences);

        expect(updated).toBeDefined();
        expect(updated.dietaryRestrictions).toEqual(updatePreferences.dietaryRestrictions);
        expect(updated.allergies).toEqual(updatePreferences.allergies);
        expect(updated.preferredCategories).toEqual(updatePreferences.preferredCategories);
      });
    });

    describe('delete', () => {
      it('should delete user preferences', async () => {
        const preferencesDto: UserPreferencesDto = {
          dietaryRestrictions: ['vegetarian'],
          allergies: ['nuts'],
          preferredCategories: ['Fruits'],
        };

        await userPreferencesRepository.create(testUser.id, preferencesDto);
        await userPreferencesRepository.delete(testUser.id);

        const found = await userPreferencesRepository.findByUserId(testUser.id);
        expect(found).toBeNull();
      });
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique keycloak id constraint', async () => {
      const keycloakId = 'unique-keycloak-id';
      
      await userRepository.create({
        keycloakId,
        email: 'integration-test-unique-1@example.com',
        firstName: 'First',
        lastName: 'User',
      });

      await expect(
        userRepository.create({
          keycloakId,
          email: 'integration-test-unique-2@example.com',
          firstName: 'Second',
          lastName: 'User',
        })
      ).rejects.toThrow();
    });

    it('should enforce unique email constraint', async () => {
      const email = 'integration-test-unique@example.com';
      
      await userRepository.create({
        keycloakId: 'unique-keycloak-1',
        email,
        firstName: 'First',
        lastName: 'User',
      });

      await expect(
        userRepository.create({
          keycloakId: 'unique-keycloak-2',
          email,
          firstName: 'Second',
          lastName: 'User',
        })
      ).rejects.toThrow();
    });

    it('should cascade delete preferences when user is deleted', async () => {
      const user = await userRepository.create({
        keycloakId: 'cascade-test-user',
        email: 'integration-test-cascade@example.com',
        firstName: 'Cascade',
        lastName: 'Test',
      });

      await userPreferencesRepository.create(user.id, {
        dietaryRestrictions: ['vegetarian'],
        allergies: [],
        preferredCategories: [],
      });

      await userRepository.delete(user.id);

      const preferences = await userPreferencesRepository.findByUserId(user.id);
      expect(preferences).toBeNull();
    });
  });

  describe('User with Preferences Integration', () => {
    it('should create user and preferences together', async () => {
      const user = await userRepository.create({
        keycloakId: 'integration-full-test',
        email: 'integration-test-full@example.com',
        firstName: 'Full',
        lastName: 'Test',
      });

      const preferences = await userPreferencesRepository.create(user.id, {
        dietaryRestrictions: ['vegetarian', 'organic'],
        allergies: ['nuts', 'shellfish'],
        preferredCategories: ['Fruits', 'Vegetables', 'Grains'],
      });

      const userWithPreferences = await userRepository.findById(user.id);

      expect(userWithPreferences).toBeDefined();
      expect(userWithPreferences!.preferences).toBeDefined();
      expect(userWithPreferences!.preferences!.id).toBe(preferences.id);
      expect(userWithPreferences!.preferences!.dietaryRestrictions).toEqual(preferences.dietaryRestrictions);
    });
  });
});