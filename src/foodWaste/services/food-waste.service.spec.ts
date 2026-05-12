import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Unit, WasteReason, DetectionMethod } from '@prisma/client';
import {
  FoodWasteService,
  UNIT_TO_KG_CONVERSION,
  CARBON_ESTIMATES_BY_CATEGORY,
} from './food-waste.service';
import { FoodWasteRepository } from '../repositories/food-waste.repository';
import { PantryItemRepository } from '../../pantry/repositories/pantry-items.repository';
import { FoodProductRepository } from '../../food-products/repositories/food-product.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  TEST_FOOD_WASTE,
  TEST_FOOD_WASTE_2,
  TEST_CREATE_FOOD_WASTE_DTO,
  TEST_UPDATE_FOOD_WASTE_DTO,
  TEST_QUERY_FOOD_WASTE_DTO,
} from '../../../test/fixtures/food-waste.fixtures';
import { TEST_FOOD } from '../../../test/fixtures/food.fixtures';

describe('FoodWasteService', () => {
  let service: FoodWasteService;
  let foodWasteRepository: jest.Mocked<FoodWasteRepository>;
  let pantryItemRepository: jest.Mocked<PantryItemRepository>;
  let foodProductRepository: jest.Mocked<FoodProductRepository>;
  let prismaService: { $transaction: jest.Mock };

  const mockFoodWaste = { ...TEST_FOOD_WASTE };
  const mockFood: any = { ...TEST_FOOD };

  const mockPantryItem = {
    id: 'pantry-item-1',
    foodProductId: 'food-1',
    quantity: 1.5,
    unit: Unit.KG,
    pantry: {
      id: 'pantry-1',
      userId: 'user-1',
    },
  };

  const mockFoodWasteRepositoryMethods = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findWithPagination: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    getStatistics: jest.fn(),
    getTrends: jest.fn(),
  };

  const mockPantryItemRepositoryMethods = {
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
  };

  const mockFoodProductRepositoryMethods = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodWasteService,
        {
          provide: FoodWasteRepository,
          useValue: mockFoodWasteRepositoryMethods,
        },
        {
          provide: PantryItemRepository,
          useValue: mockPantryItemRepositoryMethods,
        },
        {
          provide: FoodProductRepository,
          useValue: mockFoodProductRepositoryMethods,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FoodWasteService>(FoodWasteService);
    foodWasteRepository = module.get(FoodWasteRepository);
    pantryItemRepository = module.get(PantryItemRepository);
    foodProductRepository = module.get(FoodProductRepository);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-1';

    it('should create a food waste entry successfully', async () => {
      pantryItemRepository.findById.mockResolvedValue(mockPantryItem as any);
      foodWasteRepository.create.mockResolvedValue(mockFoodWaste);
      pantryItemRepository.delete.mockResolvedValue(undefined);

      // Configure $transaction to execute the callback
      prismaService.$transaction.mockImplementation(
        async (callback) => await callback({}),
      );

      const result = await service.create(TEST_CREATE_FOOD_WASTE_DTO, userId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockFoodWaste.id);
      expect(pantryItemRepository.findById).toHaveBeenCalledWith(
        TEST_CREATE_FOOD_WASTE_DTO.pantryItemId,
      );
      expect(foodWasteRepository.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if pantry item does not exist', async () => {
      pantryItemRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(TEST_CREATE_FOOD_WASTE_DTO as any, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if pantry item does not belong to user', async () => {
      const wrongUserPantryItem = {
        ...mockPantryItem,
        pantry: {
          ...mockPantryItem.pantry,
          userId: 'different-user',
        },
      };

      pantryItemRepository.findById.mockResolvedValue(
        wrongUserPantryItem as any,
      );

      await expect(
        service.create(TEST_CREATE_FOOD_WASTE_DTO as any, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete pantry item when wasting full quantity', async () => {
      pantryItemRepository.findById.mockResolvedValue(mockPantryItem as any);
      foodWasteRepository.create.mockResolvedValue(mockFoodWaste);
      pantryItemRepository.delete.mockResolvedValue(undefined);

      // Configure $transaction to execute the callback
      prismaService.$transaction.mockImplementation(
        async (callback) => await callback({}),
      );

      const result = await service.create(TEST_CREATE_FOOD_WASTE_DTO, userId);

      expect(result).toBeDefined();
      expect(pantryItemRepository.delete).toHaveBeenCalledWith(
        'pantry-item-1',
        expect.anything(),
      );
      expect(pantryItemRepository.update).not.toHaveBeenCalled();
    });

    it('should reduce pantry item quantity when wasting partial quantity', async () => {
      const dtoWithPantryItem = {
        ...TEST_CREATE_FOOD_WASTE_DTO,
        quantity: 0.5, // Less than pantry item quantity (1.5 KG)
        unit: Unit.KG,
      };

      pantryItemRepository.findById.mockResolvedValue(mockPantryItem as any);
      foodWasteRepository.create.mockResolvedValue(mockFoodWaste);
      pantryItemRepository.update.mockResolvedValue(mockPantryItem as any);

      // Configure $transaction to execute the callback
      prismaService.$transaction.mockImplementation(
        async (callback) => await callback({}),
      );

      const result = await service.create(dtoWithPantryItem, userId);

      expect(result).toBeDefined();
      expect(pantryItemRepository.update).toHaveBeenCalledWith(
        'pantry-item-1',
        { quantity: 1.0 }, // 1.5 - 0.5 = 1.0
        expect.anything(),
      );
      expect(pantryItemRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle unit conversion when reducing pantry item (G to KG)', async () => {
      const dtoWithPantryItem = {
        ...TEST_CREATE_FOOD_WASTE_DTO,
        quantity: 500, // 500g = 0.5kg
        unit: Unit.G,
      };

      pantryItemRepository.findById.mockResolvedValue(mockPantryItem as any); // 1.5 KG
      foodWasteRepository.create.mockResolvedValue(mockFoodWaste);
      pantryItemRepository.update.mockResolvedValue(mockPantryItem as any);

      // Configure $transaction to execute the callback
      prismaService.$transaction.mockImplementation(
        async (callback) => await callback({}),
      );

      const result = await service.create(dtoWithPantryItem, userId);

      expect(result).toBeDefined();
      expect(pantryItemRepository.update).toHaveBeenCalledWith(
        'pantry-item-1',
        { quantity: 1.0 }, // 1.5 - 0.5 = 1.0 KG
        expect.anything(),
      );
    });

    it('should delete pantry item when units are incompatible', async () => {
      const dtoWithPantryItem = {
        ...TEST_CREATE_FOOD_WASTE_DTO,
        quantity: 2,
        unit: Unit.PIECES, // Incompatible with pantry item's KG
      };

      pantryItemRepository.findById.mockResolvedValue(mockPantryItem as any);
      foodWasteRepository.create.mockResolvedValue(mockFoodWaste);
      pantryItemRepository.delete.mockResolvedValue(undefined);

      // Configure $transaction to execute the callback
      prismaService.$transaction.mockImplementation(
        async (callback) => await callback({}),
      );

      const result = await service.create(dtoWithPantryItem, userId);

      expect(result).toBeDefined();
      expect(pantryItemRepository.delete).toHaveBeenCalledWith(
        'pantry-item-1',
        expect.anything(),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated food waste entries', async () => {
      const mockPaginatedResult = {
        data: [mockFoodWaste, TEST_FOOD_WASTE_2],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      foodWasteRepository.findWithPagination.mockResolvedValue(
        mockPaginatedResult,
      );

      const result = await service.findAll('user-1', TEST_QUERY_FOOD_WASTE_DTO);

      expect(result).toBeDefined();
      expect(result.total).toBe(2);
      expect(foodWasteRepository.findWithPagination).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      const mockPaginatedResult = {
        data: [mockFoodWaste],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      foodWasteRepository.findWithPagination.mockResolvedValue(
        mockPaginatedResult,
      );

      const query = {
        page: 1,
        limit: 10,
        foodProductId: 'food-1',
        wasteReason: WasteReason.EXPIRED,
        dateFrom: '2026-02-01',
        dateTo: '2026-02-28',
      };

      await service.findAll('user-1', query);

      expect(foodWasteRepository.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            foodProductId: 'food-1',
            wasteReason: WasteReason.EXPIRED,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a food waste entry by id', async () => {
      foodWasteRepository.findById.mockResolvedValue(mockFoodWaste);

      const result = await service.findOne('food-waste-1', 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('food-waste-1');
      expect(foodWasteRepository.findById).toHaveBeenCalledWith('food-waste-1');
    });

    it('should throw NotFoundException if entry does not exist', async () => {
      foodWasteRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if entry belongs to another user', async () => {
      const otherUserWaste = { ...mockFoodWaste, userId: 'other-user' };
      foodWasteRepository.findById.mockResolvedValue(otherUserWaste);

      await expect(service.findOne('food-waste-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update a food waste entry successfully', async () => {
      const updatedWaste = { ...mockFoodWaste, ...TEST_UPDATE_FOOD_WASTE_DTO };
      foodWasteRepository.findById.mockResolvedValue(mockFoodWaste);
      foodWasteRepository.update.mockResolvedValue(updatedWaste);

      const result = await service.update(
        'food-waste-1',
        TEST_UPDATE_FOOD_WASTE_DTO,
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.quantity).toBe(TEST_UPDATE_FOOD_WASTE_DTO.quantity);
      expect(foodWasteRepository.update).toHaveBeenCalledWith(
        'food-waste-1',
        expect.objectContaining(TEST_UPDATE_FOOD_WASTE_DTO),
      );
    });

    it('should throw NotFoundException if entry does not exist', async () => {
      foodWasteRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(
          'non-existent',
          TEST_UPDATE_FOOD_WASTE_DTO as any,
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if entry belongs to another user', async () => {
      const otherUserWaste = { ...mockFoodWaste, userId: 'other-user' };
      foodWasteRepository.findById.mockResolvedValue(otherUserWaste);

      await expect(
        service.update(
          'food-waste-1',
          TEST_UPDATE_FOOD_WASTE_DTO as any,
          'user-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should validate new food exists when foodId changes', async () => {
      const updateWithNewFood = { foodProductId: 'new-food-product-id' };
      foodWasteRepository.findById.mockResolvedValue(mockFoodWaste);
      foodProductRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('food-waste-1', updateWithNewFood, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a food waste entry', async () => {
      foodWasteRepository.findById.mockResolvedValue(mockFoodWaste);
      foodWasteRepository.delete.mockResolvedValue(undefined);

      await service.remove('food-waste-1', 'user-1');

      expect(foodWasteRepository.delete).toHaveBeenCalledWith('food-waste-1');
    });

    it('should throw NotFoundException if entry does not exist', async () => {
      foodWasteRepository.findById.mockResolvedValue(null);

      await expect(service.remove('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if entry belongs to another user', async () => {
      const otherUserWaste = { ...mockFoodWaste, userId: 'other-user' };
      foodWasteRepository.findById.mockResolvedValue(otherUserWaste);

      await expect(service.remove('food-waste-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getStatistics', () => {
    it('should return food waste statistics', async () => {
      const mockStats = {
        totalWaste: 10,
        totalCost: 50.0,
        totalCarbon: 15.5,
        wasteByReason: {
          [WasteReason.EXPIRED]: 5,
          [WasteReason.SPOILED]: 3,
          [WasteReason.OVERCOOKED]: 0,
          [WasteReason.UNWANTED]: 0,
          [WasteReason.PORTION_TOO_LARGE]: 0,
          [WasteReason.OTHER]: 2,
        },
        wasteByMethod: {
          [DetectionMethod.MANUAL]: 6,
          [DetectionMethod.AUTOMATIC]: 2,
        },
        mostWastedFoods: [
          {
            itemId: 'food-1',
            foodName: 'Test Food',
            totalQuantity: 5,
            count: 3,
          },
        ],
      };

      foodWasteRepository.getStatistics.mockResolvedValue(mockStats);

      const result = await service.getStatistics('user-1');

      expect(result).toBeDefined();
      expect(result.totalWaste).toBe(10);
      expect(foodWasteRepository.getStatistics).toHaveBeenCalledWith(
        'user-1',
        undefined,
        undefined,
      );
    });

    it('should filter statistics by date range', async () => {
      const mockStats = {
        totalWaste: 5,
        totalCost: 25.0,
        totalCarbon: 7.5,
        wasteByReason: {
          [WasteReason.EXPIRED]: 0,
          [WasteReason.SPOILED]: 0,
          [WasteReason.OVERCOOKED]: 0,
          [WasteReason.UNWANTED]: 0,
          [WasteReason.PORTION_TOO_LARGE]: 0,
          [WasteReason.OTHER]: 0,
        },
        wasteByMethod: {
          [DetectionMethod.MANUAL]: 0,
          [DetectionMethod.AUTOMATIC]: 0,
        },
        mostWastedFoods: [],
      };

      foodWasteRepository.getStatistics.mockResolvedValue(mockStats);

      await service.getStatistics('user-1', '2026-02-01', '2026-02-28');

      expect(foodWasteRepository.getStatistics).toHaveBeenCalledWith(
        'user-1',
        expect.any(Date),
        expect.any(Date),
      );
    });
  });

  describe('getTrends', () => {
    it('should return food waste trends', async () => {
      const mockTrends = [
        {
          date: new Date('2026-02-13'),
          totalWaste: 1.5,
          totalCost: 5.99,
          totalCarbon: 1.25,
          count: 1,
        },
        {
          date: new Date('2026-02-14'),
          totalWaste: 0.5,
          totalCost: 2.5,
          totalCarbon: 0.75,
          count: 1,
        },
      ];

      foodWasteRepository.getTrends.mockResolvedValue(mockTrends);

      const result = await service.getTrends(
        'user-1',
        '2026-02-13',
        '2026-02-14',
        'day',
      );

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(foodWasteRepository.getTrends).toHaveBeenCalledWith(
        'user-1',
        expect.any(Date),
        expect.any(Date),
        'day',
      );
    });

    it('should support different intervals', async () => {
      const mockTrends = [
        {
          date: new Date('2026-02-01'),
          totalWaste: 10,
          totalCost: 50,
          totalCarbon: 15,
          count: 5,
        },
      ];

      foodWasteRepository.getTrends.mockResolvedValue(mockTrends);

      await service.getTrends('user-1', '2026-02-01', '2026-02-28', 'week');

      expect(foodWasteRepository.getTrends).toHaveBeenCalledWith(
        'user-1',
        expect.any(Date),
        expect.any(Date),
        'week',
      );
    });
  });

  describe('calculateCarbonFootprint', () => {
    it('should calculate carbon footprint for food', async () => {
      foodProductRepository.findById.mockResolvedValue(mockFood);

      const result = await service.calculateCarbonFootprint(
        'food-1',
        1.5,
        Unit.KG,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('should return default estimate when food not found', async () => {
      foodProductRepository.findById.mockResolvedValue(null);

      const result = await service.calculateCarbonFootprint(
        'non-existent',
        1.0,
        Unit.KG,
      );

      const expectedDefault =
        1.0 *
        UNIT_TO_KG_CONVERSION[Unit.KG] *
        CARBON_ESTIMATES_BY_CATEGORY.default;
      expect(result).toBe(Math.round(expectedDefault * 100) / 100);
    });

    it('should convert units correctly', async () => {
      foodProductRepository.findById.mockResolvedValue(mockFood);

      // 1000g = 1kg, should give same result
      const resultKg = await service.calculateCarbonFootprint(
        'food-1',
        1,
        Unit.KG,
      );
      const resultG = await service.calculateCarbonFootprint(
        'food-1',
        1000,
        Unit.G,
      );

      expect(resultKg).toBeCloseTo(resultG, 1);
    });
  });

  describe('batchCreateFromExpired', () => {
    it('should batch create waste entries from expired pantry items', async () => {
      const batchDto = {
        items: [{ pantryItemId: 'pantry-item-1', notes: 'Test notes' }],
      };

      pantryItemRepository.findById.mockResolvedValue(mockPantryItem as any);
      foodWasteRepository.create.mockResolvedValue(mockFoodWaste);
      pantryItemRepository.delete.mockResolvedValue(undefined);
      foodProductRepository.findById.mockResolvedValue(mockFood);

      const result = await service.batchCreateFromExpired(batchDto, 'user-1');

      expect(result).toBeDefined();
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(pantryItemRepository.delete).toHaveBeenCalledWith(
        'pantry-item-1',
        expect.any(Object),
      );
    });

    it('should handle errors for individual items', async () => {
      const batchDto = {
        items: [
          { pantryItemId: 'non-existent' },
          { pantryItemId: 'pantry-item-1' },
        ],
      };

      pantryItemRepository.findById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockPantryItem as any);
      foodWasteRepository.create.mockResolvedValue(mockFoodWaste);
      pantryItemRepository.delete.mockResolvedValue(undefined);
      foodProductRepository.findById.mockResolvedValue(mockFood);

      const result = await service.batchCreateFromExpired(batchDto, 'user-1');

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].pantryItemId).toBe('non-existent');
    });

    it('should reject unauthorized pantry items', async () => {
      const batchDto = {
        items: [{ pantryItemId: 'pantry-item-1' }],
      };
      const otherUserPantryItem = {
        ...mockPantryItem,
        pantry: { ...mockPantryItem.pantry, userId: 'other-user' },
      };

      pantryItemRepository.findById.mockResolvedValue(
        otherUserPantryItem as any,
      );

      const result = await service.batchCreateFromExpired(batchDto, 'user-1');

      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].error).toContain('Not authorized');
    });
  });
});
