import { Test, TestingModule } from '@nestjs/testing';
import { PantryService } from './pantry.service';
import { PantryRepository } from '../repositories/pantry.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  BadRequestException,
  ConflictException,
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
    findAllByUserId: jest.fn(),
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

  describe('getAllPantriesByUserId', () => {
    it('should return all pantries for user', async () => {
      const pantries = [mockPantry, { ...mockPantry, id: 'pantry-2', title: 'Second Pantry' }];
      mockPantryRepository.findAllByUserId.mockResolvedValue(pantries);

      const result = await service.getAllPantriesByUserId('user-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'pantry-1');
      expect(result[1]).toHaveProperty('id', 'pantry-2');
      expect(repository.findAllByUserId).toHaveBeenCalledWith('user-1');
      expect(repository.findAllByUserId).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no pantries exist for user', async () => {
      mockPantryRepository.findAllByUserId.mockResolvedValue([]);

      const result = await service.getAllPantriesByUserId('user-2');

      expect(result).toEqual([]);
      expect(repository.findAllByUserId).toHaveBeenCalledWith('user-2');
    });

    it('should log when getting all pantries for user', async () => {
      mockPantryRepository.findAllByUserId.mockResolvedValue([mockPantry]);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.getAllPantriesByUserId('user-1');

      expect(loggerSpy).toHaveBeenCalledWith('Getting all pantries for user: user-1');
    });
  });

  describe('getPantryById', () => {
    it('should return pantry when it exists and belongs to user', async () => {
      mockPantryRepository.findById.mockResolvedValue(mockPantry);

      const result = await service.getPantryById('pantry-1', 'user-1');

      expect(result).toHaveProperty('id', 'pantry-1');
      expect(result).toHaveProperty('title', 'My Pantry');
      expect(result).toHaveProperty('userId', 'user-1');
      expect(repository.findById).toHaveBeenCalledWith('pantry-1');
    });

    it('should throw NotFoundException when pantry does not exist', async () => {
      mockPantryRepository.findById.mockResolvedValue(null);

      await expect(service.getPantryById('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getPantryById('non-existent', 'user-1')).rejects.toThrow(
        'Pantry not found',
      );
    });

    it('should throw ForbiddenException when pantry belongs to different user', async () => {
      mockPantryRepository.findById.mockResolvedValue({
        ...mockPantry,
        userId: 'other-user',
      });

      await expect(service.getPantryById('pantry-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getPantryById('pantry-1', 'user-1')).rejects.toThrow(
        'No permission - user does not own this pantry',
      );
    });

    it('should log when getting pantry by id', async () => {
      mockPantryRepository.findById.mockResolvedValue(mockPantry);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.getPantryById('pantry-1', 'user-1');

      expect(loggerSpy).toHaveBeenCalledWith('Getting pantry pantry-1 for user: user-1');
    });
  });

  describe('create', () => {
    it('should create a new pantry successfully', async () => {
      const createDto = {
        title: 'New Pantry',
      };
      const userId = 'user-2';

      mockPantryRepository.create.mockResolvedValue({
        id: 'pantry-2',
        ...createDto,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto, userId);

      expect(result).toHaveProperty('id', 'pantry-2');
      expect(result.title).toBe(createDto.title);
      expect(result.userId).toBe(userId);
      expect(repository.create).toHaveBeenCalledWith({ ...createDto, userId });
    });

    it('should throw error if creation fails', async () => {
      const createDto = {
        title: 'New Pantry',
      };
      const userId = 'user-2';

      mockPantryRepository.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(createDto, userId)).rejects.toThrow(
        'Failed to create pantry',
      );
    });

    it('should pass all DTO properties to repository', async () => {
      const createDto = {
        title: 'Custom Pantry',
      };
      const userId = 'user-5';

      mockPantryRepository.create.mockResolvedValue({
        id: 'pantry-5',
        ...createDto,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(createDto, userId);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom Pantry',
          userId: 'user-5',
        }),
      );
    });

    it('should throw ConflictException when pantry with same title already exists', async () => {
      const createDto = {
        title: 'Existing Pantry',
      };
      const userId = 'user-2';

      mockPantryRepository.create.mockRejectedValue(
        new Error('A pantry with this title already exists for this user.'),
      );

      await expect(service.create(createDto, userId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto, userId)).rejects.toThrow(
        'A pantry with this title already exists for this user.',
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
    it('should return pantry id when pantryId is provided and exists', async () => {
      mockPantryRepository.findById.mockResolvedValue(mockPantry);

      const result = await service.validatePantryExists('user-1', 'pantry-1');

      expect(result).toBe('pantry-1');
      expect(repository.findById).toHaveBeenCalledWith('pantry-1');
      expect(repository.findById).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when pantryId is provided but pantry does not exist', async () => {
      mockPantryRepository.findById.mockResolvedValue(null);

      await expect(service.validatePantryExists('user-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.validatePantryExists('user-1', 'non-existent')).rejects.toThrow(
        'Pantry not found',
      );
    });

    it('should throw ForbiddenException when pantryId is provided but belongs to different user', async () => {
      mockPantryRepository.findById.mockResolvedValue({
        ...mockPantry,
        userId: 'other-user',
      });

      await expect(service.validatePantryExists('user-1', 'pantry-1')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.validatePantryExists('user-1', 'pantry-1')).rejects.toThrow(
        'No permission - user does not own this pantry',
      );
    });

    it('should return first pantry id when pantryId is not provided', async () => {
      mockPantryRepository.findByUserId.mockResolvedValue(mockPantry);

      const result = await service.validatePantryExists('user-1');

      expect(result).toBe('pantry-1');
      expect(repository.findByUserId).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundException when pantryId is not provided and no pantry exists', async () => {
      mockPantryRepository.findByUserId.mockResolvedValue(null);

      await expect(service.validatePantryExists('user-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.validatePantryExists('user-1')).rejects.toThrow(
        'No pantry found. Please create a pantry first or specify a pantryId.',
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
