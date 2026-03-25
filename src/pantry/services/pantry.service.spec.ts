import { Test, TestingModule } from '@nestjs/testing';
import { PantryService } from './pantry.service';
import { PantryRepository } from '../repositories/pantry.repository';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PantryTestBuilder } from '../test-utils/pantry-test-builders';
import { TEST_IDS } from '../../common/test-utils/test-constants';

describe('PantryService', () => {
  let service: PantryService;
  let repository: PantryRepository;

  const mockPantryRepository = {
    findByUserId: jest.fn(),
    getOrCreate: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PantryService,
        {
          provide: PantryRepository,
          useValue: mockPantryRepository,
        },
      ],
    }).compile();

    service = module.get<PantryService>(PantryService);
    repository = module.get<PantryRepository>(PantryRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreatePantry', () => {
    const userId = TEST_IDS.USER;

    it('should return existing pantry when it exists', async () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto();
      mockPantryRepository.getOrCreate.mockResolvedValue(mockPantry);

      const result = await service.getOrCreatePantry(userId);

      expect(result.id).toBe(TEST_IDS.PANTRY);
      expect(result.userId).toBe(userId);
      expect(repository.getOrCreate).toHaveBeenCalledWith(userId);
    });

    it('should create and return new pantry when it does not exist', async () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto();
      mockPantryRepository.getOrCreate.mockResolvedValue(mockPantry);

      const result = await service.getOrCreatePantry(userId);

      expect(result).toBeDefined();
      expect(repository.getOrCreate).toHaveBeenCalledWith(userId);
    });

    it('should log when getting or creating pantry', async () => {
      const mockPantry = PantryTestBuilder.createPantryResponseDto();
      mockPantryRepository.getOrCreate.mockResolvedValue(mockPantry);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.getOrCreatePantry(userId);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Getting or creating pantry for user: ${userId}`,
      );
    });
  });

  describe('validatePantryExists', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;

    describe('when pantryId is provided', () => {
      it('should return pantryId when pantry exists and belongs to user', async () => {
        const mockPantry = PantryTestBuilder.createPantryResponseDto({
          id: pantryId,
          userId: userId,
        });
        mockPantryRepository.findById.mockResolvedValue(mockPantry);

        const result = await service.validatePantryExists(userId, pantryId);

        expect(result).toBe(pantryId);
        expect(repository.findById).toHaveBeenCalledWith(pantryId);
      });

      it('should throw NotFoundException when pantry does not exist', async () => {
        mockPantryRepository.findById.mockResolvedValue(null);

        await expect(
          service.validatePantryExists(userId, pantryId),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException when pantry belongs to different user', async () => {
        const mockPantry = PantryTestBuilder.createPantryResponseDto({
          id: pantryId,
          userId: 'different-user-id',
        });
        mockPantryRepository.findById.mockResolvedValue(mockPantry);

        await expect(
          service.validatePantryExists(userId, pantryId),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('when pantryId is not provided', () => {
      it('should auto-create pantry and return its ID', async () => {
        const mockPantry = PantryTestBuilder.createPantryResponseDto();
        mockPantryRepository.getOrCreate.mockResolvedValue(mockPantry);

        const result = await service.validatePantryExists(userId);

        expect(result).toBe(mockPantry.id);
        expect(repository.getOrCreate).toHaveBeenCalledWith(userId);
      });
    });
  });
});
