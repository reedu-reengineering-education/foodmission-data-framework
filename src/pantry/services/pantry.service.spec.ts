import { Test, TestingModule } from '@nestjs/testing';
import { PantryService } from './pantry.service';
import { PantryRepository } from '../repositories/pantry.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('PantryService', () => {
  let service: PantryService;
  let repository: PantryRepository;

  const mockPantry = {
    id: 'pantry-1',
    title: 'My Pantry',
    userId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    items: [],
  };

  const mockPantryRepository = {
    findByUserId: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrismaService = {
    pantry: {
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PantryService,
        {
          provide: PantryRepository,
          useValue: mockPantryRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PantryService>(PantryService);
    repository = module.get<PantryRepository>(PantryRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPantryByUserId', () => {
    it('should return existing pantry for user', async () => {
      mockPantryRepository.findByUserId.mockResolvedValue(mockPantry);

      const result = await service.getPantryByUserId('user-1');

      expect(result).toHaveProperty('id', 'pantry-1');
      expect(result).toHaveProperty('title', 'My Pantry');
      expect(result).toHaveProperty('userId', 'user-1');
      expect(repository.findByUserId).toHaveBeenCalledWith('user-1');
      expect(repository.findByUserId).toHaveBeenCalledTimes(1);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create new pantry if none exists for user', async () => {
      const newPantry = {
        ...mockPantry,
        id: 'pantry-2',
        userId: 'user-2',
      };
      const newPantryWithRelations = {
        ...newPantry,
        items: [],
      };
      mockPantryRepository.findByUserId.mockResolvedValueOnce(null); // No pantry found
      mockPantryRepository.create.mockResolvedValue(newPantryWithRelations);

      const result = await service.getPantryByUserId('user-2');

      expect(repository.findByUserId).toHaveBeenCalledWith('user-2');
      expect(repository.findByUserId).toHaveBeenCalledTimes(1); // Only once to check
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-2',
        title: 'My Pantry',
      });
      expect(result).toHaveProperty('id', 'pantry-2');
      expect(result).toHaveProperty('userId', 'user-2');
    });

    it('should log when getting pantry for user', async () => {
      mockPantryRepository.findByUserId.mockResolvedValue(mockPantry);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.getPantryByUserId('user-1');

      expect(loggerSpy).toHaveBeenCalledWith('Getting pantry for user: user-1');
    });

    it('should log when creating new pantry', async () => {
      const newPantryWithRelations = {
        ...mockPantry,
        id: 'pantry-3',
        userId: 'user-3',
        items: [],
      };
      mockPantryRepository.findByUserId.mockResolvedValueOnce(null);
      mockPantryRepository.create.mockResolvedValue(newPantryWithRelations);

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.getPantryByUserId('user-3');

      expect(loggerSpy).toHaveBeenCalledWith('Getting pantry for user: user-3');
      expect(loggerSpy).toHaveBeenCalledWith(
        'No pantry found for user user-3, creating one...',
      );
    });
  });

  describe('create', () => {
    it('should create a new pantry successfully', async () => {
      const createDto = {
        title: 'New Pantry',
        userId: 'user-2',
      };

      mockPantryRepository.create.mockResolvedValue({
        id: 'pantry-2',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto);

      expect(result).toHaveProperty('id', 'pantry-2');
      expect(result.title).toBe(createDto.title);
      expect(result.userId).toBe(createDto.userId);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw error if creation fails', async () => {
      const createDto = {
        title: 'New Pantry',
        userId: 'user-2',
      };

      mockPantryRepository.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        'Failed to create pantry',
      );
    });

    it('should pass all DTO properties to repository', async () => {
      const createDto = {
        title: 'Custom Pantry',
        userId: 'user-5',
      };

      mockPantryRepository.create.mockResolvedValue({
        id: 'pantry-5',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom Pantry',
          userId: 'user-5',
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a pantry successfully', async () => {
      const updateDto = { title: 'Updated Pantry' };
      const updatedPantry = {
        ...mockPantry,
        title: 'Updated Pantry',
      };

      mockPantryRepository.findById.mockResolvedValue(mockPantry);
      mockPantryRepository.update.mockResolvedValue(updatedPantry);

      const result = await service.update('pantry-1', updateDto, 'user-1');

      expect(result.title).toBe('Updated Pantry');
      expect(repository.findById).toHaveBeenCalledWith('pantry-1');
      expect(repository.update).toHaveBeenCalledWith('pantry-1', updateDto);
    });

    it('should throw NotFoundException if pantry does not exist', async () => {
      mockPantryRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { title: 'New' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('non-existent-id', { title: 'New' }, 'user-1'),
      ).rejects.toThrow('Pantry not found');
    });

    it('should throw ForbiddenException if user does not own pantry', async () => {
      mockPantryRepository.findById.mockResolvedValue({
        ...mockPantry,
        userId: 'other-user',
      });

      await expect(
        service.update('pantry-1', { title: 'New' }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update('pantry-1', { title: 'New' }, 'user-1'),
      ).rejects.toThrow('No premission');
    });

    it('should throw BadRequestException on unexpected error', async () => {
      mockPantryRepository.findById.mockResolvedValue(mockPantry);
      mockPantryRepository.update.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.update('pantry-1', { title: 'New' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('pantry-1', { title: 'New' }, 'user-1'),
      ).rejects.toThrow('Failed to update pantry');
    });

    it('should allow update without userId parameter', async () => {
      const updateDto = { title: 'No User Check' };
      mockPantryRepository.findById.mockResolvedValue({
        ...mockPantry,
        userId: undefined,
      });
      mockPantryRepository.update.mockResolvedValue({
        ...mockPantry,
        ...updateDto,
      });

      await service.update('pantry-1', updateDto, undefined);

      expect(repository.update).toHaveBeenCalledWith('pantry-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a pantry successfully', async () => {
      mockPantryRepository.findById.mockResolvedValue(mockPantry);
      mockPantryRepository.delete.mockResolvedValue(undefined);

      await service.remove('pantry-1', 'user-1');

      expect(repository.findById).toHaveBeenCalledWith('pantry-1');
      expect(repository.delete).toHaveBeenCalledWith('pantry-1');
    });

    it('should throw NotFoundException if pantry does not exist', async () => {
      mockPantryRepository.findById.mockResolvedValue(null);

      await expect(service.remove('non-existent-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove('non-existent-id', 'user-1')).rejects.toThrow(
        'pantry not found',
      );
    });

    it('should throw ForbiddenException if user does not own pantry', async () => {
      mockPantryRepository.findById.mockResolvedValue({
        ...mockPantry,
        userId: 'other-user',
      });

      await expect(service.remove('pantry-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove('pantry-1', 'user-1')).rejects.toThrow(
        'No premission',
      );
    });

    it('should throw BadRequestException on unexpected error', async () => {
      mockPantryRepository.findById.mockResolvedValue(mockPantry);
      mockPantryRepository.delete.mockRejectedValue(new Error('DB Error'));

      await expect(service.remove('pantry-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove('pantry-1', 'user-1')).rejects.toThrow(
        'Failed to delete pantry',
      );
    });

    it('should allow deletion without userId parameter', async () => {
      mockPantryRepository.findById.mockResolvedValue({
        ...mockPantry,
        userId: undefined,
      });
      mockPantryRepository.delete.mockResolvedValue(undefined);

      await service.remove('pantry-1', undefined);

      expect(repository.delete).toHaveBeenCalledWith('pantry-1');
    });
  });

  describe('validatePantryExists', () => {
    it('should return pantry id if pantry exists', async () => {
      mockPantryRepository.findByUserId.mockResolvedValue(mockPantry);

      const result = await service.validatePantryExists('user-1');

      expect(result).toBe('pantry-1');
      expect(repository.findByUserId).toHaveBeenCalledWith('user-1');
      expect(repository.findByUserId).toHaveBeenCalledTimes(1);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create pantry and return id if pantry does not exist', async () => {
      const newPantry = {
        ...mockPantry,
        id: 'pantry-new',
        userId: 'user-999',
      };

      const newPantryWithRelations = {
        ...newPantry,
        items: [],
      };
      mockPantryRepository.findByUserId.mockResolvedValueOnce(null);
      mockPantryRepository.create.mockResolvedValue(newPantryWithRelations);

      const result = await service.validatePantryExists('user-999');

      expect(result).toBe('pantry-new');
      expect(repository.findByUserId).toHaveBeenCalledWith('user-999');
      expect(repository.findByUserId).toHaveBeenCalledTimes(1); // Only once to check
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-999',
        title: 'My Pantry',
      });
    });

    it('should log when creating new pantry', async () => {
      const newPantryWithRelations = {
        ...mockPantry,
        id: 'pantry-new',
        userId: 'user-888',
        items: [],
      };

      mockPantryRepository.findByUserId.mockResolvedValueOnce(null);
      mockPantryRepository.create.mockResolvedValue(newPantryWithRelations);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.validatePantryExists('user-888');

      expect(loggerSpy).toHaveBeenCalledWith(
        'No pantry found for user user-888, creating one...',
      );
    });

    it('should throw error if repository create fails', async () => {
      mockPantryRepository.findByUserId.mockResolvedValue(null);
      mockPantryRepository.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.validatePantryExists('user-666')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('transformToResponseDto', () => {
    it('should transform pantry to response DTO', () => {
      const result = service['transformToResponseDto'](mockPantry);

      expect(result).toHaveProperty('id', 'pantry-1');
      expect(result).toHaveProperty('title', 'My Pantry');
      expect(result).toHaveProperty('userId', 'user-1');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should only include specific fields in response DTO', () => {
      const pantryWithExtraFields = {
        ...mockPantry,
        items: [{ id: 'item-1', name: 'Test' }],
        someOtherField: 'should not be included',
      };

      const result = service['transformToResponseDto'](pantryWithExtraFields);

      expect(result).toHaveProperty('items');
      expect(result).not.toHaveProperty('someOtherField');
    });

    it('should handle pantry with null values', () => {
      const pantryWithNulls = {
        ...mockPantry,
        title: null,
      };

      const result = service['transformToResponseDto'](pantryWithNulls);

      expect(result).toHaveProperty('title', null);
    });
  });
});
