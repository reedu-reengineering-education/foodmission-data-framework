import { TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PantryItemController } from './pantryItem.controller';
import { PantryItemService } from '../services/pantryItem.service';
import { createControllerTestModule } from '../../common/test-utils/controller-test-helpers';
import { createMockPantryItemService } from '../test-utils/pantry-item-service.mock';
import { PantryItemTestBuilder } from '../test-utils/pantry-item-test-builders';
import { createMockRequest } from '../../common/test-utils/mock-factories';
import { TEST_IDS } from '../../common/test-utils/test-constants';
import { Unit } from '@prisma/client';

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

    it('should create a pantry item successfully', async () => {
      mockPantryItemService.create.mockResolvedValue(mockResponse);

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

    it('should propagate NotFoundException when food does not exist', async () => {
      mockPantryItemService.create.mockRejectedValue(
        new NotFoundException('Food item not found'),
      );

      await expect(controller.create(createDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate ConflictException when food already exists in pantry', async () => {
      mockPantryItemService.create.mockRejectedValue(
        new ConflictException('This food item is already in your pantry'),
      );

      await expect(controller.create(createDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    const userId = TEST_IDS.USER;
    const mockResponse = { data: [] };

    const mockRequest = createMockRequest({
      path: '/pantry-item',
      originalUrl: '/api/v1/pantry-item',
      url: '/api/v1/pantry-item',
    });

    it('should return pantry items with pantryId query param', async () => {
      const query = PantryItemTestBuilder.createQueryPantryItemDto();

      mockPantryItemService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(query, mockRequest, userId);

      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith(query, userId);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return pantry items with query params', async () => {
      const query = PantryItemTestBuilder.createQueryPantryItemDto({
        foodId: TEST_IDS.FOOD,
        unit: Unit.KG,
      });

      mockPantryItemService.findAll.mockResolvedValue({
        ...mockResponse,
        data: [],
      });

      const result = await controller.findAll(query, mockRequest, userId);

      expect(result).toEqual({ ...mockResponse, data: [] });
      expect(service.findAll).toHaveBeenCalledWith(query, userId);
    });

    it('should handle filtering by unit only', async () => {
      const query = PantryItemTestBuilder.createQueryPantryItemDto({
        unit: Unit.G,
      });

      const filteredResponse = { data: [] };

      mockPantryItemService.findAll.mockResolvedValue(filteredResponse);

      const result = await controller.findAll(query, mockRequest, userId);

      expect(result).toEqual(filteredResponse);
      expect(service.findAll).toHaveBeenCalledWith(query, userId);
    });

    it('should throw BadRequestException when path has trailing slash', async () => {
      const requestWithTrailingSlash = createMockRequest({
        path: '/pantry-item',
        originalUrl: '/api/v1/pantry-item/',
        url: '/api/v1/pantry-item/',
      });
      const query = PantryItemTestBuilder.createQueryPantryItemDto();

      await expect(
        controller.findAll(query, requestWithTrailingSlash, userId),
      ).rejects.toThrow(BadRequestException);
      expect(service.findAll).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when userId is null', async () => {
      const query = PantryItemTestBuilder.createQueryPantryItemDto();

      await expect(
        controller.findAll(query, mockRequest, null as unknown as string),
      ).rejects.toThrow(UnauthorizedException);
      expect(service.findAll).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    const userId = TEST_IDS.USER;
    const itemId = TEST_IDS.PANTRY_ITEM;

    const mockResponse = PantryItemTestBuilder.createPantryItemResponseDto({
      id: itemId,
    });

    it('should return pantry item by id', async () => {
      mockPantryItemService.findById.mockResolvedValue(mockResponse);

      const result = await controller.findById(itemId, userId);

      expect(result).toEqual(mockResponse);
      expect(service.findById).toHaveBeenCalledWith(itemId, userId);
      expect(service.findById).toHaveBeenCalledTimes(1);
    });

    it('should propagate NotFoundException when item does not exist', async () => {
      mockPantryItemService.findById.mockRejectedValue(
        new NotFoundException('Pantry item not found'),
      );

      await expect(controller.findById(itemId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate ForbiddenException when user does not own pantry', async () => {
      mockPantryItemService.findById.mockRejectedValue(
        new ForbiddenException('You do not have access to this pantry item'),
      );

      await expect(controller.findById(itemId, userId)).rejects.toThrow(
        ForbiddenException,
      );
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

    it('should update pantry item successfully', async () => {
      mockPantryItemService.update.mockResolvedValue(mockResponse);

      const result = await controller.update(itemId, updateDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.update).toHaveBeenCalledWith(itemId, updateDto, userId);
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('should propagate NotFoundException when item does not exist', async () => {
      mockPantryItemService.update.mockRejectedValue(
        new NotFoundException('Pantry item not found'),
      );

      await expect(
        controller.update(itemId, updateDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when user does not own pantry', async () => {
      mockPantryItemService.update.mockRejectedValue(
        new ForbiddenException('You do not have access to this pantry item'),
      );

      await expect(
        controller.update(itemId, updateDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate ConflictException when food already exists in pantry', async () => {
      mockPantryItemService.update.mockRejectedValue(
        new ConflictException('This food item is already in your pantry'),
      );

      await expect(
        controller.update(itemId, updateDto, userId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    const userId = TEST_IDS.USER;
    const itemId = TEST_IDS.PANTRY_ITEM;

    it('should delete pantry item successfully', async () => {
      mockPantryItemService.remove.mockResolvedValue(undefined);

      await controller.remove(itemId, userId);

      expect(service.remove).toHaveBeenCalledWith(itemId, userId);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('should propagate NotFoundException when item does not exist', async () => {
      mockPantryItemService.remove.mockRejectedValue(
        new NotFoundException('Pantry item not found'),
      );

      await expect(controller.remove(itemId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate ForbiddenException when user does not own pantry', async () => {
      mockPantryItemService.remove.mockRejectedValue(
        new ForbiddenException('You do not have access to this pantry item'),
      );

      await expect(controller.remove(itemId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
