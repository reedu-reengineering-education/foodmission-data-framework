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
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PantryTestBuilder } from '../test-utils/pantry-test-builders';
import { TEST_IDS } from '../../common/test-utils/test-constants';

describe('PantryService', () => {
  let service: PantryService;
  let repository: PantryRepository;

  const mockPantryRepository = {
    findByUserId: jest.fn(),
    findAllByUserId: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
          useValue: {},
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
    const userId = TEST_IDS.USER;

    it('should return the pantry for the user', async () => {
      const pantry = PantryTestBuilder.createPantryResponseDto();
      mockPantryRepository.findByUserId.mockResolvedValue(pantry);

      const result = await service.getPantryByUserId(userId);

      expect(result).toEqual(pantry);
      expect(repository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException if no pantry exists for the user', async () => {
      mockPantryRepository.findByUserId.mockResolvedValue(null);

      await expect(service.getPantryByUserId(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const userId = TEST_IDS.USER;
    const createPantryDto = PantryTestBuilder.createCreatePantryDto();

    it('should throw ConflictException if user already has a pantry', async () => {
      const existingPantry = PantryTestBuilder.createPantryResponseDto();
      mockPantryRepository.findByUserId.mockResolvedValue(existingPantry);

      await expect(service.create(createPantryDto, userId)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.findByUserId).toHaveBeenCalledWith(userId);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create a pantry if user does not have one', async () => {
      mockPantryRepository.findByUserId.mockResolvedValue(null);
      const createdPantry = PantryTestBuilder.createPantryResponseDto();
      mockPantryRepository.create.mockResolvedValue(createdPantry);

      const result = await service.create(createPantryDto, userId);

      expect(result).toEqual(createdPantry);
      expect(repository.findByUserId).toHaveBeenCalledWith(userId);
      expect(repository.create).toHaveBeenCalledWith({
        ...createPantryDto,
        userId,
      });
    });

    it('should throw BadRequestException when creation fails with generic error', async () => {
      const createDto = PantryTestBuilder.createCreatePantryDto();
      mockPantryRepository.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(createDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, userId)).rejects.toThrow(
        'Failed to create pantry',
      );
    });

    it('should throw ConflictException when pantry with same title already exists', async () => {
      const createDto = PantryTestBuilder.createCreatePantryDto({
        title: 'Existing Pantry',
      });
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
          meta: { target: ['userId', 'title'] },
        },
      );
      mockPantryRepository.create.mockRejectedValue(prismaError);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto, userId)).rejects.toThrow(
        'A pantry with this title already exists for this user.',
      );
    });
  });

  describe('validatePantryExists', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;

    it('should return pantry id when pantryId is provided and exists', async () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto({
        id: pantryId,
        userId: userId,
      });
      mockPantryRepository.findById.mockResolvedValue(mockPantry);

      const result = await service.validatePantryExists(userId, pantryId);

      expect(result).toBe(pantryId);
      expect(repository.findById).toHaveBeenCalled();
      expect(repository.findById).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when pantryId is provided but pantry does not exist', async () => {
      mockPantryRepository.findById.mockResolvedValue(null);

      await expect(
        service.validatePantryExists(userId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when pantryId is provided but belongs to different user', async () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto({
        id: pantryId,
        userId: 'other-user',
      });
      mockPantryRepository.findById.mockResolvedValue(mockPantry);

      await expect(
        service.validatePantryExists(userId, pantryId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return first pantry id when pantryId is not provided', async () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto({
        id: pantryId,
        userId: userId,
      });
      mockPantryRepository.findByUserId.mockResolvedValue(mockPantry);

      const result = await service.validatePantryExists(userId);

      expect(result).toBe(pantryId);
      expect(repository.findByUserId).toHaveBeenCalled();
    });

    it('should throw NotFoundException when pantryId is not provided and no pantry exists', async () => {
      mockPantryRepository.findByUserId.mockResolvedValue(null);

      await expect(service.validatePantryExists(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('transformToResponseDto', () => {
    it('should transform pantry to response DTO with all required fields', () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto();
      const result = service['transformToResponseDto'](mockPantry);

      expect(result.id).toBe(mockPantry.id);
      expect(result.title).toBe(mockPantry.title);
      expect(result.userId).toBe(mockPantry.userId);
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should only include specific fields in response DTO', () => {
      const pantryWithExtraFields = {
        ...PantryTestBuilder.createPantryResponseDto(),
        items: [{ id: 'item-1', name: 'Test' }],
        someOtherField: 'should not be included',
      };

      const result = service['transformToResponseDto'](pantryWithExtraFields);

      expect(result).toHaveProperty('items');
      expect(result).not.toHaveProperty('someOtherField');
    });

    it('should handle pantry with null values', () => {
      const pantryWithNulls = {
        ...PantryTestBuilder.createPantryResponseDto(),
        title: null,
      };

      const result = service['transformToResponseDto'](pantryWithNulls);

      expect(result).toHaveProperty('title', null);
    });
  });

  describe('updateUserPantry', () => {
    const userId = TEST_IDS.USER;
    const updatePantryDto = PantryTestBuilder.createUpdatePantryDto();

    it('should update the pantry for the user', async () => {
      const existingPantry = PantryTestBuilder.createPantryResponseDto();
      const updatedPantry = { ...existingPantry, ...updatePantryDto };

      mockPantryRepository.findByUserId.mockResolvedValue(existingPantry);
      mockPantryRepository.update.mockResolvedValue(updatedPantry);

      const result = await service.updateUserPantry(updatePantryDto, userId);

      expect(result).toEqual(updatedPantry);
      expect(repository.findByUserId).toHaveBeenCalledWith(userId);
      expect(repository.update).toHaveBeenCalledWith(
        existingPantry.id,
        updatePantryDto,
      );
    });

    it('should throw NotFoundException if no pantry exists for the user', async () => {
      mockPantryRepository.findByUserId.mockResolvedValue(null);

      await expect(
        service.updateUserPantry(updatePantryDto, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUserPantry', () => {
    const userId = TEST_IDS.USER;

    it('should delete the pantry for the user', async () => {
      const existingPantry = PantryTestBuilder.createPantryResponseDto();
      mockPantryRepository.findByUserId.mockResolvedValue(existingPantry);

      await service.deleteUserPantry(userId);

      expect(repository.findByUserId).toHaveBeenCalledWith(userId);
      expect(repository.delete).toHaveBeenCalledWith(existingPantry.id);
    });

    it('should throw NotFoundException if no pantry exists for the user', async () => {
      mockPantryRepository.findByUserId.mockResolvedValue(null);

      await expect(service.deleteUserPantry(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
