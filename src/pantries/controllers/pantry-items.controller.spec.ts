import { TestingModule } from '@nestjs/testing';
import { PantryItemsController } from './pantry-items.controller';
import { PantryItemService } from '../services/pantry-items.service';
import { createControllerTestModule } from '../../common/test-utils/controller-test-helpers';
import { createMockPantryItemsService } from '../test-utils/pantry-items-service.mock';
import { PantryItemsTestBuilder } from '../test-utils/pantry-items-test-builders';
import { TEST_IDS } from '../../common/test-utils/test-constants';

describe('PantryItemsController', () => {
  let controller: PantryItemsController;
  let service: PantryItemService;
  let mockPantryItemsService: ReturnType<typeof createMockPantryItemsService>;

  beforeEach(async () => {
    mockPantryItemsService = createMockPantryItemsService();
    const module: TestingModule = await createControllerTestModule<
      PantryItemsController,
      PantryItemService
    >({
      ControllerClass: PantryItemsController,
      ServiceToken: PantryItemService,
      mockService: mockPantryItemsService,
    });

    controller = module.get<PantryItemsController>(PantryItemsController);
    service = module.get<PantryItemService>(PantryItemService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;
    const body = PantryItemsTestBuilder.createCreatePantryItemDto({
      pantryId: undefined,
    } as any);
    delete (body as any).pantryId;
    const mockResponse = PantryItemsTestBuilder.createPantryItemResponseDto();

    it('should call service with merged pantryId and return result', async () => {
      mockPantryItemsService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(pantryId, body as any, userId);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ pantryId }),
        userId,
      );
      expect(service.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;
    const mockResponse = { data: [] };

    it('should call service with query including pantryId and return result', async () => {
      const query = PantryItemsTestBuilder.createQueryPantryItemDto();
      delete (query as any).pantryId;

      mockPantryItemsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(pantryId, query as any, userId);

      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ pantryId }),
        userId,
      );
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;
    const itemId = TEST_IDS.PANTRY_ITEM;

    const mockResponse = PantryItemsTestBuilder.createPantryItemResponseDto({
      id: itemId,
    });

    it('should call service with itemId, userId, and pantryId', async () => {
      mockPantryItemsService.findById.mockResolvedValue(mockResponse);

      const result = await controller.findById(pantryId, itemId, userId);

      expect(result).toEqual(mockResponse);
      expect(service.findById).toHaveBeenCalledWith(itemId, userId, pantryId);
      expect(service.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;
    const itemId = TEST_IDS.PANTRY_ITEM;
    const updateDto = PantryItemsTestBuilder.createUpdatePantryItemDto();
    const mockResponse = PantryItemsTestBuilder.createPantryItemResponseDto({
      id: itemId,
      ...updateDto,
    });

    it('should call service with correct parameters and return result', async () => {
      mockPantryItemsService.update.mockResolvedValue(mockResponse);

      const result = await controller.update(
        pantryId,
        itemId,
        updateDto,
        userId,
      );

      expect(result).toEqual(mockResponse);
      expect(service.update).toHaveBeenCalledWith(
        itemId,
        updateDto,
        userId,
        pantryId,
      );
      expect(service.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;
    const itemId = TEST_IDS.PANTRY_ITEM;

    it('should call service with itemId, userId, and pantryId', async () => {
      mockPantryItemsService.remove.mockResolvedValue(undefined);

      await controller.remove(pantryId, itemId, userId);

      expect(service.remove).toHaveBeenCalledWith(itemId, userId, pantryId);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });
  });
});
