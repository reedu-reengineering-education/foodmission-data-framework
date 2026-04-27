import { Test, TestingModule } from '@nestjs/testing';
import { MealItemRepository } from './meal-items.repository';
import { PrismaService } from '../../../database/prisma.service';
import { Unit } from '@prisma/client';
import { TEST_MEAL_ITEM_WITH_FOOD } from '../../../../test/fixtures/meal-item.fixtures';
import { MEAL_ITEM_TEST_IDS as TEST_IDS } from '../test-utils/meal-item-test-ids';

describe('MealItemRepository', () => {
  let repository: MealItemRepository;
  let prisma: PrismaService;

  const mockMealItemWithFood = TEST_MEAL_ITEM_WITH_FOOD;

  const mockPrismaService = {
    mealItem: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealItemRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<MealItemRepository>(MealItemRepository);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a meal item with food product', async () => {
      mockPrismaService.mealItem.create.mockResolvedValue(mockMealItemWithFood);

      const result = await repository.create({
        mealId: TEST_IDS.MEAL,
        foodProductId: TEST_IDS.FOOD_PRODUCT,
        genericFoodId: null,
        itemType: 'food_product',
        quantity: 2,
        unit: Unit.PIECES,
        notes: 'Test notes',
      });

      expect(result).toEqual(mockMealItemWithFood);
      expect(prisma.mealItem.create).toHaveBeenCalledWith({
        data: {
          mealId: TEST_IDS.MEAL,
          foodProductId: TEST_IDS.FOOD_PRODUCT,
          genericFoodId: null,
          itemType: 'food_product',
          quantity: 2,
          unit: Unit.PIECES,
          notes: 'Test notes',
        },
        include: {
          meal: true,
          foodProduct: true,
          genericFood: true,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all meal items', async () => {
      const mockItems = [mockMealItemWithFood];
      mockPrismaService.mealItem.findMany.mockResolvedValue(mockItems);
      const result = await repository.findAll();
      expect(result).toEqual(mockItems);
      expect(prisma.mealItem.findMany).toHaveBeenCalledWith({
        include: {
          meal: true,
          foodProduct: true,
          genericFood: true,
        },
      });
    });
  });

  describe('findByMealId', () => {
    it('should return all items for a meal ordered by createdAt', async () => {
      const mockItems = [mockMealItemWithFood];
      mockPrismaService.mealItem.findMany.mockResolvedValue(mockItems);

      const result = await repository.findByMealId(TEST_IDS.MEAL);

      expect(result).toEqual(mockItems);
      expect(prisma.mealItem.findMany).toHaveBeenCalledWith({
        where: { mealId: TEST_IDS.MEAL },
        include: {
          meal: true,
          foodProduct: true,
          genericFood: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('should return a meal item by id', async () => {
      mockPrismaService.mealItem.findUnique.mockResolvedValue(
        mockMealItemWithFood,
      );

      const result = await repository.findById(TEST_IDS.MEAL_ITEM);

      expect(result).toEqual(mockMealItemWithFood);
      expect(prisma.mealItem.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_IDS.MEAL_ITEM },
        include: {
          meal: true,
          foodProduct: true,
          genericFood: true,
        },
      });
    });

    it('should return null if meal item not found', async () => {
      mockPrismaService.mealItem.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByMealAndFoodProduct', () => {
    it('should find a meal item by meal and food product', async () => {
      mockPrismaService.mealItem.findFirst.mockResolvedValue(
        mockMealItemWithFood,
      );

      const result = await repository.findByMealAndFoodProduct(
        TEST_IDS.MEAL,
        TEST_IDS.FOOD_PRODUCT,
      );

      expect(result).toEqual(mockMealItemWithFood);
      expect(prisma.mealItem.findFirst).toHaveBeenCalledWith({
        where: {
          mealId: TEST_IDS.MEAL,
          foodProductId: TEST_IDS.FOOD_PRODUCT,
        },
        include: {
          meal: true,
          foodProduct: true,
          genericFood: true,
        },
      });
    });
  });

  describe('findByMealAndGenericFood', () => {
    it('should find a meal item by meal and generic food', async () => {
      const mockItemWithCategory = {
        ...mockMealItemWithFood,
        itemType: 'generic_food',
        foodProductId: null,
        genericFoodId: TEST_IDS.GENERIC_FOOD,
        foodProduct: null,
        genericFood: {
          id: TEST_IDS.GENERIC_FOOD,
          name: 'Fruits',
          nevoCode: '01.001',
          description: 'Fresh fruits',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      };

      mockPrismaService.mealItem.findFirst.mockResolvedValue(
        mockItemWithCategory,
      );

      const result = await repository.findByMealAndGenericFood(
        TEST_IDS.MEAL,
        TEST_IDS.GENERIC_FOOD,
      );

      expect(result).toEqual(mockItemWithCategory);
      expect(prisma.mealItem.findFirst).toHaveBeenCalledWith({
        where: {
          mealId: TEST_IDS.MEAL,
          genericFoodId: TEST_IDS.GENERIC_FOOD,
        },
        include: {
          meal: true,
          foodProduct: true,
          genericFood: true,
        },
      });
    });
  });

  describe('checkForDuplicateItem', () => {
    it('should check for duplicate by food product', async () => {
      mockPrismaService.mealItem.findFirst.mockResolvedValue(
        mockMealItemWithFood,
      );

      const result = await repository.checkForDuplicateItem(
        TEST_IDS.MEAL,
        { foodProductId: TEST_IDS.FOOD_PRODUCT },
      );

      expect(result).toEqual(mockMealItemWithFood);
    });

    it('should check for duplicate by generic food', async () => {
      mockPrismaService.mealItem.findFirst.mockResolvedValue(null);

      const result = await repository.checkForDuplicateItem(
        TEST_IDS.MEAL,
        { genericFoodId: TEST_IDS.GENERIC_FOOD },
      );

      expect(result).toBeNull();
    });

    it('should return null if neither food nor category provided', async () => {
      const result = await repository.checkForDuplicateItem(
        TEST_IDS.MEAL,
        {},
      );

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a meal item', async () => {
      const updatedItem = {
        ...mockMealItemWithFood,
        quantity: 3,
      };

      mockPrismaService.mealItem.update.mockResolvedValue(updatedItem);

      const result = await repository.update(TEST_IDS.MEAL_ITEM, {
        quantity: 3,
      });

      expect(result).toEqual(updatedItem);
      expect(prisma.mealItem.update).toHaveBeenCalledWith({
        where: { id: TEST_IDS.MEAL_ITEM },
        data: { quantity: 3 },
        include: {
          meal: true,
          foodProduct: true,
          genericFood: true,
        },
      });
    });
  });

  describe('delete', () => {
    it('should delete a meal item', async () => {
      mockPrismaService.mealItem.delete.mockResolvedValue(mockMealItemWithFood);

      await repository.delete(TEST_IDS.MEAL_ITEM);

      expect(prisma.mealItem.delete).toHaveBeenCalledWith({
        where: { id: TEST_IDS.MEAL_ITEM },
      });
    });
  });

  describe('deleteByMealId', () => {
    it('should delete all items for a meal', async () => {
      mockPrismaService.mealItem.deleteMany.mockResolvedValue({ count: 2 });

      await repository.deleteByMealId(TEST_IDS.MEAL);

      expect(prisma.mealItem.deleteMany).toHaveBeenCalledWith({
        where: { mealId: TEST_IDS.MEAL },
      });
    });
  });

  describe('count', () => {
    it('should return the count of meal items', async () => {
      mockPrismaService.mealItem.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(prisma.mealItem.count).toHaveBeenCalled();
    });
  });
});
