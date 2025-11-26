import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PantryItemController } from './pantryItem.controller';
import { PantryItemService } from '../services/pantryItem.service';
import { CreatePantryItemDto } from '../dto/create-pantryItem.dto';
import { UpdatePantryItemDto } from '../dto/update-pantryItem.dto';
import { QueryPantryItemDto } from '../dto/query-pantryItem.dto';
import { PantryItemResponseDto } from '../dto/response-pantryItem.dto';
import { MultiplePantryItemResponseDto } from '../dto/response-pantryItem.dto';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Unit } from '@prisma/client';

describe('PantryItemController', () => {
  let controller: PantryItemController;
  let service: PantryItemService;

  const mockPantryItemService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockDataBaseAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockThrottlerGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PantryItemController],
      providers: [
        {
          provide: PantryItemService,
          useValue: mockPantryItemService,
        },
        {
          provide: DataBaseAuthGuard,
          useValue: mockDataBaseAuthGuard,
        },
        {
          provide: ThrottlerGuard,
          useValue: mockThrottlerGuard,
        },
        Reflector,
      ],
    })
      .overrideGuard(DataBaseAuthGuard)
      .useValue(mockDataBaseAuthGuard)
      .overrideGuard(ThrottlerGuard)
      .useValue(mockThrottlerGuard)
      .compile();

    controller = module.get<PantryItemController>(PantryItemController);
    service = module.get<PantryItemService>(PantryItemService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-123';
    const createDto: CreatePantryItemDto = {
      foodId: 'food-123',
      quantity: 2,
      unit: Unit.KG,
      notes: 'Store in cool place',
      expiryDate: new Date('2027-02-02'),
    };

    const mockResponse: PantryItemResponseDto = {
      id: 'item-123',
      pantryId: 'pantry-123',
      foodId: 'food-123',
      quantity: 2,
      unit: Unit.KG,
      notes: 'Store in cool place',
      expiryDate: new Date('2027-02-02'),
    };

    it('should create a pantry item successfully', async () => {
      mockPantryItemService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(createDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(createDto, userId);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when userId is missing', async () => {
      await expect(controller.create(createDto, null as any)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.create(createDto, null as any)).rejects.toThrow(
        'User not authenticated',
      );
      expect(service.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when userId is empty string', async () => {
      await expect(controller.create(createDto, '')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(service.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const mockResponse: MultiplePantryItemResponseDto = {
      data: [],
    };

    const mockRequest = {
      path: '/pantry-item',
      originalUrl: '/api/v1/pantry-item',
      url: '/api/v1/pantry-item',
    } as any;

    it('should return pantry items without query params', async () => {
      mockPantryItemService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll({}, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith({});
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return pantry items with query params', async () => {
      const query: QueryPantryItemDto = {
        foodId: 'food-123',
        unit: Unit.KG,
        page: 1,
        limit: 10,
      };

      mockPantryItemService.findAll.mockResolvedValue({
        ...mockResponse,
        data: [],
      });

      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual({ ...mockResponse, data: [] });
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle pagination query params', async () => {
      const query: QueryPantryItemDto = {
        page: 2,
        limit: 20,
      };

      const paginatedResponse: MultiplePantryItemResponseDto = {
        data: [],
      };

      mockPantryItemService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(paginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should throw BadRequestException when path has trailing slash', async () => {
      const requestWithTrailingSlash = {
        path: '/pantry-item',
        originalUrl: '/api/v1/pantry-item/',
        url: '/api/v1/pantry-item/',
      } as any;

      await expect(
        controller.findAll({}, requestWithTrailingSlash),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.findAll({}, requestWithTrailingSlash),
      ).rejects.toThrow('Invalid request path');
      expect(service.findAll).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    const userId = 'user-123';
    const itemId = 'item-123';

    const mockResponse: PantryItemResponseDto = {
      id: itemId,
      pantryId: 'pantry-123',
      foodId: 'food-123',
      quantity: 2,
      unit: Unit.KG,
    };

    it('should return pantry item by id', async () => {
      mockPantryItemService.findById.mockResolvedValue(mockResponse);

      const result = await controller.findById(itemId, userId);

      expect(result).toEqual(mockResponse);
      expect(service.findById).toHaveBeenCalledWith(itemId, userId);
      expect(service.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    const userId = 'user-123';
    const itemId = 'item-123';
    const updateDto: UpdatePantryItemDto = {
      quantity: 3,
      unit: Unit.PIECES,
      notes: 'Updated notes',
    };

    const mockResponse: PantryItemResponseDto = {
      id: itemId,
      pantryId: 'pantry-123',
      foodId: 'food-123',
      quantity: 3,
      unit: Unit.PIECES,
      notes: 'Updated notes',
    };

    it('should update pantry item successfully', async () => {
      mockPantryItemService.update.mockResolvedValue(mockResponse);

      const result = await controller.update(itemId, updateDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.update).toHaveBeenCalledWith(itemId, updateDto, userId);
      expect(service.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    const userId = 'user-123';
    const itemId = 'item-123';

    it('should delete pantry item successfully', async () => {
      mockPantryItemService.remove.mockResolvedValue(undefined);

      await controller.remove(itemId, userId);

      expect(service.remove).toHaveBeenCalledWith(itemId, userId);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });
  });
});

