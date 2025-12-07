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

  describe('getAllPantriesByUserId', () => {
    const userId = TEST_IDS.USER;

    it('should transform pantries to DTOs and return them', async () => {
      const pantries = PantryTestBuilder.createPantryResponseDtoArray(2);
      mockPantryRepository.findAllByUserId.mockResolvedValue(pantries);

      const result = await service.getAllPantriesByUserId(userId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(`${TEST_IDS.PANTRY}-1`);
      expect(result[1].id).toBe(`${TEST_IDS.PANTRY}-2`);
      expect(repository.findAllByUserId).toHaveBeenCalled();
    });

    it('should log when getting all pantries for user', async () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto();
      mockPantryRepository.findAllByUserId.mockResolvedValue([mockPantry]);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.getAllPantriesByUserId(userId);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Getting all pantries for user: ${userId}`,
      );
    });
  });

  describe('getPantryById', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;

    it('should return transformed pantry when it exists and belongs to user', async () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto({
        id: pantryId,
        userId: userId,
      });
      mockPantryRepository.findById.mockResolvedValue(mockPantry);

      const result = await service.getPantryById(pantryId, userId);

      expect(result.id).toBe(pantryId);
      expect(result.userId).toBe(userId);
      expect(repository.findById).toHaveBeenCalled();
    });

    it('should throw NotFoundException when pantry does not exist', async () => {
      mockPantryRepository.findById.mockResolvedValue(null);

      await expect(
        service.getPantryById('non-existent', userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when pantry belongs to different user', async () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto({
        id: pantryId,
        userId: 'other-user',
      });
      mockPantryRepository.findById.mockResolvedValue(mockPantry);

      await expect(service.getPantryById(pantryId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should log when getting pantry by id', async () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto({
        id: pantryId,
        userId: userId,
      });
      mockPantryRepository.findById.mockResolvedValue(mockPantry);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.getPantryById(pantryId, userId);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Getting pantry ${pantryId} for user: ${userId}`,
      );
    });
  });

  describe('create', () => {
    const userId = TEST_IDS.USER;

    it('should create pantry and transform to DTO', async () => {
      const createDto = PantryTestBuilder.createCreatePantryDto();
      const createdPantry = PantryTestBuilder.createPantryResponseDto({
        ...createDto,
        userId,
      });
      mockPantryRepository.create.mockResolvedValue(createdPantry);

      const result = await service.create(createDto, userId);

      expect(result.id).toBe(createdPantry.id);
      expect(result.userId).toBe(userId);
      expect(repository.create).toHaveBeenCalled();
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

  describe('update', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;

    it('should update pantry when it exists and belongs to user', async () => {
      const updateDto = PantryTestBuilder.createUpdatePantryDto();
      const mockPantry = PantryTestBuilder.createPantryResponseDto({
        id: pantryId,
        userId: userId,
      });
      const updatedPantry = PantryTestBuilder.createPantryResponseDto({
        ...mockPantry,
        ...updateDto,
      });

      mockPantryRepository.findById.mockResolvedValue(mockPantry);
      mockPantryRepository.update.mockResolvedValue(updatedPantry);

      const result = await service.update(pantryId, updateDto, userId);

      expect(result.title).toBe(updateDto.title);
      expect(repository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when pantry does not exist', async () => {
      const updateDto = PantryTestBuilder.createUpdatePantryDto();
      mockPantryRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own pantry', async () => {
      const updateDto = PantryTestBuilder.createUpdatePantryDto();
      const mockPantry = PantryTestBuilder.createPantryResponseDto({
        id: pantryId,
        userId: 'other-user',
      });
      mockPantryRepository.findById.mockResolvedValue(mockPantry);

      await expect(service.update(pantryId, updateDto, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when update fails unexpectedly', async () => {
      const updateDto = PantryTestBuilder.createUpdatePantryDto();
      const mockPantry = PantryTestBuilder.createPantryResponseDto({
        id: pantryId,
        userId: userId,
      });
      mockPantryRepository.findById.mockResolvedValue(mockPantry);
      mockPantryRepository.update.mockRejectedValue(new Error('DB Error'));

      await expect(service.update(pantryId, updateDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when updating to duplicate title', async () => {
      const updateDto = PantryTestBuilder.createUpdatePantryDto({
        title: 'Duplicate Title',
      });
      const mockPantry = PantryTestBuilder.createPantryResponseDto({
        id: pantryId,
        userId: userId,
      });
      mockPantryRepository.findById.mockResolvedValue(mockPantry);
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
          meta: { target: ['userId', 'title'] },
        },
      );
      mockPantryRepository.update.mockRejectedValue(prismaError);

      await expect(service.update(pantryId, updateDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;

    it('should delete pantry when it exists and belongs to user', async () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto({
        id: pantryId,
        userId: userId,
      });
      mockPantryRepository.findById.mockResolvedValue(mockPantry);
      mockPantryRepository.delete.mockResolvedValue(undefined);

      await service.remove(pantryId, userId);

      expect(repository.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when pantry does not exist', async () => {
      mockPantryRepository.findById.mockResolvedValue(null);

      await expect(service.remove('non-existent-id', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own pantry', async () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto({
        id: pantryId,
        userId: 'other-user',
      });
      mockPantryRepository.findById.mockResolvedValue(mockPantry);

      await expect(service.remove(pantryId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when deletion fails unexpectedly', async () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto({
        id: pantryId,
        userId: userId,
      });
      mockPantryRepository.findById.mockResolvedValue(mockPantry);
      mockPantryRepository.delete.mockRejectedValue(new Error('DB Error'));

      await expect(service.remove(pantryId, userId)).rejects.toThrow(
        BadRequestException,
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
});
