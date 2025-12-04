import { TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
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

    it('should call service with correct parameters and return result', async () => {
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (invalidUserId, _description) => {
        await expect(
          controller.create(createDto, invalidUserId as string),
        ).rejects.toThrow(UnauthorizedException);
        expect(service.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('getAllPantries', () => {
    const userId = TEST_IDS.USER;
    const mockResponse = PantryTestBuilder.createPantryResponseDtoArray(2);

    it('should call service with userId and return result', async () => {
      mockPantryService.getAllPantriesByUserId.mockResolvedValue(mockResponse);

      const result = await controller.getAllPantries(userId);

      expect(result).toEqual(mockResponse);
      expect(service.getAllPantriesByUserId).toHaveBeenCalledWith(userId);
      expect(service.getAllPantriesByUserId).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPantryById', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;
    const mockResponse = PantryTestBuilder.createPantryResponseDto({
      id: pantryId,
      userId: userId,
    });

    it('should call service with pantryId and userId and return result', async () => {
      mockPantryService.getPantryById.mockResolvedValue(mockResponse);

      const result = await controller.getPantryById(pantryId, userId);

      expect(result).toEqual(mockResponse);
      expect(service.getPantryById).toHaveBeenCalledWith(pantryId, userId);
      expect(service.getPantryById).toHaveBeenCalledTimes(1);
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

    it('should call service with correct parameters and return result', async () => {
      mockPantryService.update.mockResolvedValue(mockResponse);

      const result = await controller.update(pantryId, updateDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.update).toHaveBeenCalledWith(pantryId, updateDto, userId);
      expect(service.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;

    it('should call service with pantryId and userId', async () => {
      mockPantryService.remove.mockResolvedValue(undefined);

      await controller.remove(pantryId, userId);

      expect(service.remove).toHaveBeenCalledWith(pantryId, userId);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });
  });
});
