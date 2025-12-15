import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserPreferencesDto } from '../dto/user-preferences.dto';

describe('UserController', () => {
  let controller: UserController;
  let repository: jest.Mocked<UserRepository>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    keycloakId: 'kc-1',
    firstName: 'Test',
    lastName: 'User',
    preferences: {},
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<UserRepository>> = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    repository = module.get(UserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call repository.create with dto', async () => {
      const dto = {
        email: 'test@example.com',
        keycloakId: 'kc',
      } as CreateUserDto;
      repository.create.mockResolvedValue(mockUser as any);

      const result = await controller.create(dto);

      expect(result).toEqual(mockUser);
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should call repository.findAll', async () => {
      repository.findAll.mockResolvedValue([mockUser as any]);

      const result = await controller.findAll();

      expect(result).toEqual([mockUser]);
      expect(repository.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should call repository.findOne with id', async () => {
      repository.findOne.mockResolvedValue(mockUser as any);

      const result = await controller.findOne('user-1');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith('user-1');
    });
  });

  describe('update', () => {
    it('should call repository.update with id and dto', async () => {
      const dto = { firstName: 'New' } as UpdateUserDto;
      repository.update.mockResolvedValue({
        ...mockUser,
        firstName: 'New',
      } as any);

      const result = await controller.update('user-1', dto);

      expect(result.firstName).toBe('New');
      expect(repository.update).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('remove', () => {
    it('should call repository.remove with id', async () => {
      repository.remove.mockResolvedValue(undefined as any);

      const result = await controller.remove('user-1');

      expect(result).toBeUndefined();
      expect(repository.remove).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      repository.findById.mockResolvedValue({
        ...mockUser,
        preferences: { theme: 'dark' },
      } as any);

      const result = await controller.getPreferences('user-1');

      expect(result).toEqual({ theme: 'dark' });
      expect(repository.findById).toHaveBeenCalledWith('user-1');
    });

    it('should throw when user not found', async () => {
      repository.findById.mockResolvedValue(null as any);

      await expect(controller.getPreferences('missing')).rejects.toThrow(Error);
    });
  });

  describe('updatePreferences', () => {
    it('should call repository.update with transformed preferences', async () => {
      const prefs: UserPreferencesDto = {
        dietaryRestrictions: ['vegan'],
        allergies: ['nuts'],
        preferredCategories: ['fruit'],
      };
      repository.update.mockResolvedValue({
        ...mockUser,
        preferences: prefs,
      } as any);

      const result = await controller.updatePreferences('user-1', prefs);

      expect(result.preferences).toEqual(prefs);
      expect(repository.update).toHaveBeenCalledWith('user-1', {
        preferences: {
          dietaryRestrictions: ['vegan'],
          allergies: ['nuts'],
          preferredCategories: ['fruit'],
        },
      });
    });
  });
});
