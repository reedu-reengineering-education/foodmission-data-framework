import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { PantryController } from './pantry.controller';
import { PantryService } from '../services/pantry.service';
import { CreatePantryDto } from '../dto/create-pantry.dto';
import { UpdatePantryDto } from '../dto/update-pantry.dto';
import { PantryResponseDto } from '../dto/response-pantry.dto';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

describe('PantryController', () => {
  let controller: PantryController;
  let service: PantryService;

  const mockPantryService = {
    create: jest.fn(),
    getPantryByUserId: jest.fn(),
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
      controllers: [PantryController],
      providers: [
        {
          provide: PantryService,
          useValue: mockPantryService,
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

    controller = module.get<PantryController>(PantryController);
    service = module.get<PantryService>(PantryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-123';
    const createDto: CreatePantryDto = {
      userId: 'user-123',
      title: 'My Pantry',
    };

    const mockResponse: PantryResponseDto = {
      id: 'pantry-123',
      userId: 'user-123',
      title: 'My Pantry',
      items: [],
    };

    it('should create a pantry successfully', async () => {
      mockPantryService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(createDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(createDto);
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

  describe('getMyPantry', () => {
    const userId = 'user-123';

    const mockResponse: PantryResponseDto = {
      id: 'pantry-123',
      userId: 'user-123',
      title: 'My Pantry',
      items: [],
    };

    it('should return pantry when it exists', async () => {
      mockPantryService.getPantryByUserId.mockResolvedValue(mockResponse);

      const result = await controller.getMyPantry(userId);

      expect(result).toEqual(mockResponse);
      expect(service.getPantryByUserId).toHaveBeenCalledWith(userId);
      expect(service.getPantryByUserId).toHaveBeenCalledTimes(1);
    });

    it('should return null when pantry does not exist', async () => {
      mockPantryService.getPantryByUserId.mockResolvedValue(null);

      const result = await controller.getMyPantry(userId);

      expect(result).toBeNull();
      expect(service.getPantryByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe('update', () => {
    const userId = 'user-123';
    const pantryId = 'pantry-123';
    const updateDto: UpdatePantryDto = {
      title: 'Updated Pantry Name',
    };

    const mockResponse: PantryResponseDto = {
      id: pantryId,
      userId: userId,
      title: 'Updated Pantry Name',
      items: [],
    };

    it('should update pantry successfully', async () => {
      mockPantryService.update.mockResolvedValue(mockResponse);

      const result = await controller.update(pantryId, updateDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.update).toHaveBeenCalledWith(pantryId, updateDto, userId);
      expect(service.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    const userId = 'user-123';
    const pantryId = 'pantry-123';

    it('should delete pantry successfully', async () => {
      mockPantryService.remove.mockResolvedValue(undefined);

      await controller.remove(pantryId, userId);

      expect(service.remove).toHaveBeenCalledWith(pantryId, userId);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });
  });
});

