import { TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PantryController } from './pantry.controller';
import { PantryService } from '../services/pantry.service';
import { createControllerTestModule } from '../../common/test-utils/controller-test-helpers';
import { createMockPantryService } from '../test-utils/pantry-service.mock';
import { PantryTestBuilder } from '../test-utils/pantry-test-builders';
import { TEST_IDS } from '../../common/test-utils/test-constants';

describe('PantryController', () => {
  let controller: PantryController;
  let service: PantryService;
  let mockPantryService: ReturnType<typeof createMockPantryService>;

  beforeEach(async () => {
    mockPantryService = createMockPantryService();
    const module: TestingModule = await createControllerTestModule<
      PantryController,
      PantryService
    >({
      ControllerClass: PantryController,
      ServiceToken: PantryService,
      mockService: mockPantryService,
    });

    controller = module.get<PantryController>(PantryController);
    service = module.get<PantryService>(PantryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = TEST_IDS.USER;
    const createDto = PantryTestBuilder.createCreatePantryDto();
    const mockResponse = PantryTestBuilder.createPantryResponseDto();

    it('should create a pantry successfully', async () => {
      mockPantryService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(createDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(createDto, userId);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it.each([
      [null, 'null'],
      ['', 'empty string'],
    ])(
      'should throw UnauthorizedException when userId is %s',
      async (invalidUserId, _description) => {
        await expect(
          controller.create(createDto, invalidUserId as string),
        ).rejects.toThrow(UnauthorizedException);
        expect(service.create).not.toHaveBeenCalled();
      },
    );

    it('should propagate ConflictException when pantry with same title already exists', async () => {
      mockPantryService.create.mockRejectedValue(
        new ConflictException(
          'A pantry with this title already exists for this user.',
        ),
      );

      await expect(controller.create(createDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getAllPantries', () => {
    const userId = TEST_IDS.USER;
    const mockResponse = PantryTestBuilder.createPantryResponseDtoArray(2);

    it('should return all pantries when they exist', async () => {
      mockPantryService.getAllPantriesByUserId.mockResolvedValue(mockResponse);

      const result = await controller.getAllPantries(userId);

      expect(result).toEqual(mockResponse);
      expect(result).toHaveLength(2);
      expect(service.getAllPantriesByUserId).toHaveBeenCalledWith(userId);
      expect(service.getAllPantriesByUserId).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no pantries exist', async () => {
      mockPantryService.getAllPantriesByUserId.mockResolvedValue([]);

      const result = await controller.getAllPantries(userId);

      expect(result).toEqual([]);
      expect(service.getAllPantriesByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe('getPantryById', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;
    const mockResponse = PantryTestBuilder.createPantryResponseDto({
      id: pantryId,
      userId: userId,
    });

    it('should return pantry when it exists and belongs to user', async () => {
      mockPantryService.getPantryById.mockResolvedValue(mockResponse);

      const result = await controller.getPantryById(pantryId, userId);

      expect(result).toEqual(mockResponse);
      expect(service.getPantryById).toHaveBeenCalledWith(pantryId, userId);
      expect(service.getPantryById).toHaveBeenCalledTimes(1);
    });

    it('should propagate NotFoundException when pantry does not exist', async () => {
      mockPantryService.getPantryById.mockRejectedValue(
        new NotFoundException('Pantry not found'),
      );

      await expect(controller.getPantryById(pantryId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate ForbiddenException when user does not own pantry', async () => {
      mockPantryService.getPantryById.mockRejectedValue(
        new ForbiddenException('No permission - user does not own this pantry'),
      );

      await expect(controller.getPantryById(pantryId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;
    const updateDto = PantryTestBuilder.createUpdatePantryDto();
    const mockResponse = PantryTestBuilder.createPantryResponseDto({
      id: pantryId,
      userId: userId,
      title: updateDto.title,
    });

    it('should update pantry successfully', async () => {
      mockPantryService.update.mockResolvedValue(mockResponse);

      const result = await controller.update(pantryId, updateDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.update).toHaveBeenCalledWith(pantryId, updateDto, userId);
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('should propagate NotFoundException when pantry does not exist', async () => {
      mockPantryService.update.mockRejectedValue(
        new NotFoundException('Pantry not found'),
      );

      await expect(
        controller.update(pantryId, updateDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when user does not own pantry', async () => {
      mockPantryService.update.mockRejectedValue(
        new ForbiddenException('No premission'),
      );

      await expect(
        controller.update(pantryId, updateDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;

    it('should delete pantry successfully', async () => {
      mockPantryService.remove.mockResolvedValue(undefined);

      await controller.remove(pantryId, userId);

      expect(service.remove).toHaveBeenCalledWith(pantryId, userId);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('should propagate NotFoundException when pantry does not exist', async () => {
      mockPantryService.remove.mockRejectedValue(
        new NotFoundException('pantry not found'),
      );

      await expect(controller.remove(pantryId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate ForbiddenException when user does not own pantry', async () => {
      mockPantryService.remove.mockRejectedValue(
        new ForbiddenException('No premission'),
      );

      await expect(controller.remove(pantryId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
