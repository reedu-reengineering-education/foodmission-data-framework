import { TestingModule } from '@nestjs/testing';
import { PantryItemController } from './pantryItem.controller';
import { PantryItemService } from '../services/pantryItem.service';
import { createControllerTestModule } from '../../common/test-utils/controller-test-helpers';
import { createMockPantryItemService } from '../test-utils/pantry-item-service.mock';
import { PantryItemTestBuilder } from '../test-utils/pantry-item-test-builders';
import { TEST_IDS } from '../../common/test-utils/test-constants';

describe('PantryItemController', () => {
  let controller: PantryItemController;
  let service: PantryItemService;
  let mockPantryItemService: ReturnType<typeof createMockPantryItemService>;

  beforeEach(async () => {
    mockPantryItemService = createMockPantryItemService();
    const module: TestingModule = await createControllerTestModule<
      PantryItemController,
      PantryItemService
    >({
      ControllerClass: PantryItemController,
      ServiceToken: PantryItemService,
      mockService: mockPantryItemService,
    });

    controller = module.get<PantryItemController>(PantryItemController);
    service = module.get<PantryItemService>(PantryItemService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = TEST_IDS.USER;
    const createDto = PantryItemTestBuilder.createCreatePantryItemDto();
    const mockResponse = PantryItemTestBuilder.createPantryItemResponseDto();

    it('should call service with correct parameters and return result', async () => {
      mockPantryItemService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(createDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(createDto, userId);
      expect(service.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    const userId = TEST_IDS.USER;
    const mockResponse = { data: [] };

    it('should call service with query and userId and return result', async () => {
      const query = PantryItemTestBuilder.createQueryPantryItemDto();

      mockPantryItemService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(query, userId);

      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith(query, userId);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    const userId = TEST_IDS.USER;
    const itemId = TEST_IDS.PANTRY_ITEM;

    const mockResponse = PantryItemTestBuilder.createPantryItemResponseDto({
      id: itemId,
    });

    it('should call service with itemId and userId and return result', async () => {
      mockPantryItemService.findById.mockResolvedValue(mockResponse);

      const result = await controller.findById(itemId, userId);

      expect(result).toEqual(mockResponse);
      expect(service.findById).toHaveBeenCalledWith(itemId, userId);
      expect(service.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    const userId = TEST_IDS.USER;
    const itemId = TEST_IDS.PANTRY_ITEM;
    const updateDto = PantryItemTestBuilder.createUpdatePantryItemDto();
    const mockResponse = PantryItemTestBuilder.createPantryItemResponseDto({
      id: itemId,
      ...updateDto,
    });

    it('should call service with correct parameters and return result', async () => {
      mockPantryItemService.update.mockResolvedValue(mockResponse);

      const result = await controller.update(itemId, updateDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.update).toHaveBeenCalledWith(itemId, updateDto, userId);
      expect(service.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    const userId = TEST_IDS.USER;
    const itemId = TEST_IDS.PANTRY_ITEM;

    it('should call service with itemId and userId', async () => {
      mockPantryItemService.remove.mockResolvedValue(undefined);

      await controller.remove(itemId, userId);

      expect(service.remove).toHaveBeenCalledWith(itemId, userId);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });
  });
});
