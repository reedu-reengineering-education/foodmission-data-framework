import { TestingModule } from '@nestjs/testing';
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
  });

  describe('getUserPantry', () => {
    const userId = TEST_IDS.USER;
    const mockResponse = PantryTestBuilder.createPantryResponseDto();

    it('should call service with userId and return result', async () => {
      mockPantryService.getPantryByUserId.mockResolvedValue(mockResponse);

      const result = await controller.getUserPantry(userId);

      expect(result).toEqual(mockResponse);
      expect(service.getPantryByUserId).toHaveBeenCalledWith(userId);
      expect(service.getPantryByUserId).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateUserPantry', () => {
    const userId = TEST_IDS.USER;
    const updateDto = PantryTestBuilder.createUpdatePantryDto();
    const mockResponse = PantryTestBuilder.createPantryResponseDto({
      userId: userId,
      title: updateDto.title,
    });

    it('should call service with correct parameters and return result', async () => {
      mockPantryService.updateUserPantry.mockResolvedValue(mockResponse);

      const result = await controller.updateUserPantry(updateDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.updateUserPantry).toHaveBeenCalledWith(updateDto, userId);
      expect(service.updateUserPantry).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteUserPantry', () => {
    const userId = TEST_IDS.USER;

    it('should call service with userId', async () => {
      mockPantryService.deleteUserPantry.mockResolvedValue(undefined);

      await controller.deleteUserPantry(userId);

      expect(service.deleteUserPantry).toHaveBeenCalledWith(userId);
      expect(service.deleteUserPantry).toHaveBeenCalledTimes(1);
    });
  });
});
