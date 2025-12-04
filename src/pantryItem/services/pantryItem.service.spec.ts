import { Test, TestingModule } from '@nestjs/testing';
import { PantryItemService } from './pantryItem.service';
import { PantryItemRepository } from '../repositories/pantryItem.repository';
import { PrismaService } from '../../database/prisma.service';
import { PantryService } from '../../pantry/services/pantry.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Unit } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ERROR_CODES } from '../../common/utils/error.utils';

describe('PantryItemService', () => {
  let service: PantryItemService;
  let repository: PantryItemRepository;
  let prisma: PrismaService;
  let pantryService: PantryService;

  const mockPantryItem = {
    id: 'item-1',
    quantity: 5,
    unit: Unit.KG,
    notes: 'Fresh',
    expiryDate: new Date('2024-12-31'),
    pantryId: 'pantry-1',
    foodId: 'food-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    pantry: {
      id: 'pantry-1',
      title: 'My Pantry',
      userId: 'user-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    food: {
      id: 'food-1',
      name: 'Tomatoes',
      category: 'Vegetables',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  };

  const mockPrismaService = {
    pantryItem: {
      create: jest.fn(),
    },
    food: {
      findUnique: jest.fn(),
    },
  };

  const mockPantryItemRepository = {
    findFoodInPantry: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPantryService = {
    validatePantryExists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PantryItemService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PantryItemRepository,
          useValue: mockPantryItemRepository,
        },
        {
          provide: PantryService,
          useValue: mockPantryService,
        },
      ],
    }).compile();

    service = module.get<PantryItemService>(PantryItemService);
    repository = module.get<PantryItemRepository>(PantryItemRepository);
    prisma = module.get<PrismaService>(PrismaService);
    pantryService = module.get<PantryService>(PantryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      foodId: 'food-1',
      quantity: 5,
      unit: Unit.KG,
      notes: 'Fresh',
      expiryDate: new Date('2024-12-31'),
    };

    it('should create a new pantry item successfully', async () => {
      mockPantryService.validatePantryExists.mockResolvedValue('pantry-1');
      mockPrismaService.food.findUnique.mockResolvedValue({
        id: 'food-1',
        name: 'Tomatoes',
      });
      mockPantryItemRepository.findFoodInPantry.mockResolvedValue(null);
      mockPrismaService.pantryItem.create.mockResolvedValue(mockPantryItem);

      const result = await service.create(createDto, 'user-1');

      expect(result).toHaveProperty('id');
      expect(result.quantity).toBe(5);
      expect(pantryService.validatePantryExists).toHaveBeenCalledWith('user-1');
      expect(prisma.food.findUnique).toHaveBeenCalledWith({
        where: { id: 'food-1' },
      });
      expect(repository.findFoodInPantry).toHaveBeenCalledWith(
        'pantry-1',
        'food-1',
      );
      expect(prisma.pantryItem.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if food does not exist', async () => {
      mockPantryService.validatePantryExists.mockResolvedValue('pantry-1');
      mockPrismaService.food.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        'Food item not found',
      );
    });

    it('should throw ConflictException if food already exists in pantry', async () => {
      mockPantryService.validatePantryExists.mockResolvedValue('pantry-1');
      mockPrismaService.food.findUnique.mockResolvedValue({
        id: 'food-1',
        name: 'Tomatoes',
      });
      mockPantryItemRepository.findFoodInPantry.mockResolvedValue(
        mockPantryItem,
      );

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        'This food item is already in your pantry',
      );
    });

    it('should throw BadRequestException on unexpected error', async () => {
      mockPantryService.validatePantryExists.mockResolvedValue('pantry-1');
      mockPrismaService.food.findUnique.mockResolvedValue({
        id: 'food-1',
        name: 'Tomatoes',
      });
      mockPantryItemRepository.findFoodInPantry.mockResolvedValue(null);
      mockPrismaService.pantryItem.create.mockRejectedValue(
        new Error('DB Error'),
      );

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all pantry items without filter', async () => {
      const mockItems = [mockPantryItem];
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id');
      expect(repository.findMany).toHaveBeenCalledWith({
        foodId: undefined,
        unit: undefined,
      });
    });

    it('should return filtered pantry items', async () => {
      const mockItems = [mockPantryItem];
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const result = await service.findAll({ foodId: 'food-1', unit: Unit.KG });

      expect(result.data).toHaveLength(1);
      expect(repository.findMany).toHaveBeenCalledWith({
        foodId: 'food-1',
        unit: 'KG',
      });
    });

    it('should return empty array if no items found', async () => {
      mockPantryItemRepository.findMany.mockResolvedValue([]);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return a pantry item by id', async () => {
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);

      const result = await service.findById('item-1', 'user-1');

      expect(result).toHaveProperty('id', 'item-1');
      expect(repository.findById).toHaveBeenCalledWith('item-1');
    });

    it('should throw NotFoundException if item not found', async () => {
      mockPantryItemRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own the pantry', async () => {
      mockPantryItemRepository.findById.mockResolvedValue({
        ...mockPantryItem,
        pantry: {
          ...mockPantryItem.pantry,
          userId: 'other-user',
        },
      });

      await expect(service.findById('item-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findById('item-1', 'user-1')).rejects.toThrow(
        'You do not have access to this pantry item',
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      quantity: 10,
      unit: Unit.PIECES,
      notes: 'Updated notes',
    };

    it('should update a pantry item successfully', async () => {
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPantryItemRepository.update.mockResolvedValue({
        ...mockPantryItem,
        ...updateDto,
      });

      const result = await service.update('item-1', updateDto, 'user-1');

      expect(result.quantity).toBe(10);
      expect(result.notes).toBe('Updated notes');
      expect(repository.update).toHaveBeenCalled();
    });

    it('should validate new food if foodId is provided', async () => {
      const updateWithFood = { ...updateDto, foodId: 'food-2' };
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPrismaService.food.findUnique.mockResolvedValue({
        id: 'food-2',
        name: 'Carrots',
      });
      mockPantryItemRepository.update.mockResolvedValue({
        ...mockPantryItem,
        ...updateWithFood,
      });

      await service.update('item-1', updateWithFood, 'user-1');

      expect(prisma.food.findUnique).toHaveBeenCalledWith({
        where: { id: 'food-2' },
      });
    });

    it('should throw NotFoundException if new food does not exist', async () => {
      const updateWithFood = { ...updateDto, foodId: 'food-999' };
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPrismaService.food.findUnique.mockResolvedValue(null);

      await expect(
        service.update('item-1', updateWithFood, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if food already exists in pantry', async () => {
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPrismaService.food.findUnique.mockResolvedValue({
        id: 'food-2',
        name: 'Carrots',
      });
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT,
          clientVersion: '4.0.0',
          meta: { target: ['pantryId', 'foodId'] },
        },
      );
      mockPantryItemRepository.update.mockRejectedValue(prismaError);

      await expect(
        service.update('item-1', { foodId: 'food-2' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a pantry item successfully', async () => {
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPantryItemRepository.delete.mockResolvedValue(undefined);

      await service.remove('item-1', 'user-1');

      expect(repository.findById).toHaveBeenCalledWith('item-1');
      expect(repository.delete).toHaveBeenCalledWith('item-1');
    });

    it('should throw NotFoundException if item not found', async () => {
      mockPantryItemRepository.findById.mockResolvedValue(null);

      await expect(service.remove('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own the pantry', async () => {
      mockPantryItemRepository.findById.mockResolvedValue({
        ...mockPantryItem,
        pantry: {
          ...mockPantryItem.pantry,
          userId: 'other-user',
        },
      });

      await expect(service.remove('item-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
