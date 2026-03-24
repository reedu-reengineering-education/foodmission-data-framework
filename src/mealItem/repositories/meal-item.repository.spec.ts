import { Test, TestingModule } from '@nestjs/testing';
import { MealItemRepository } from './meal-item.repository';
import { PrismaService } from '../../database/prisma.service';
import { Unit } from '@prisma/client';

describe('MealItemRepository', () => {
  let repository: MealItemRepository;
  let prisma: PrismaService;

  const TEST_IDS = {
    USER: 'user-uuid-123',
    MEAL: 'meal-uuid-123',
    MEAL_ITEM: 'meal-item-uuid-123',
    FOOD: 'food-uuid-123',
    FOOD_CATEGORY: 'food-category-uuid-123',
  };

  const mockMealItemWithFood = {
    id: TEST_IDS.MEAL_ITEM,
    mealId: TEST_IDS.MEAL,
    itemType: 'food',
    foodId: TEST_IDS.FOOD,
    foodCategoryId: null,
    quantity: 2,
    unit: Unit.PIECES,
    notes: 'Test notes',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    meal: {
      id: TEST_IDS.MEAL,
      name: 'Breakfast',
      userId: TEST_IDS.USER,
      calories: 500,
      proteins: 20,
      nutritionalInfo: {},
      sustainabilityScore: null,
      price: null,
      barcode: null,
      recipeId: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    food: {
      id: TEST_IDS.FOOD,
      name: 'Banana',
      barcode: '1234567890',
      quantity: '100g',
      description: 'Fresh banana',
      allergens: [],
      proteins: 1.1,
      carbohydrates: 23,
      fats: 0.3,
      calories: 89,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    foodCategory: null,
  };

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
    it('should create a meal item with food', async () => {
      mockPrismaService.mealItem.create.mockResolvedValue(mockMealItemWithFood);

      const result = await repository.create({
        mealId: TEST_IDS.MEAL,
        foodId: TEST_IDS.FOOD,
        foodCategoryId: null,
        itemType: 'food',
        quantity: 2,
        unit: Unit.PIECES,
        notes: 'Test notes',
      });

      expect(result).toEqual(mockMealItemWithFood);
      expect(prisma.mealItem.create).toHaveBeenCalledWith({
        data: {
          mealId: TEST_IDS.MEAL,
          foodId: TEST_IDS.FOOD,
          foodCategoryId: null,
          itemType: 'food',
          quantity: 2,
          unit: Unit.PIECES,
          notes: 'Test notes',
        },
        include: {
          meal: true,
          food: true,
          foodCategory: true,
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
          food: true,
          foodCategory: true,
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
          food: true,
          foodCategory: true,
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
          food: true,
          foodCategory: true,
        },
      });
    });

    it('should return null if meal item not found', async () => {
      mockPrismaService.mealItem.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByMealAndFood', () => {
    it('should find a meal item by meal and food', async () => {
      mockPrismaService.mealItem.findFirst.mockResolvedValue(
        mockMealItemWithFood,
      );

      const result = await repository.findByMealAndFood(
        TEST_IDS.MEAL,
        TEST_IDS.FOOD,
      );

      expect(result).toEqual(mockMealItemWithFood);
      expect(prisma.mealItem.findFirst).toHaveBeenCalledWith({
        where: {
          mealId: TEST_IDS.MEAL,
          foodId: TEST_IDS.FOOD,
        },
        include: {
          meal: true,
          food: true,
          foodCategory: true,
        },
      });
    });
  });

  describe('findByMealAndFoodCategory', () => {
    it('should find a meal item by meal and food category', async () => {
      const mockItemWithCategory = {
        ...mockMealItemWithFood,
        itemType: 'food_category',
        foodId: null,
        foodCategoryId: TEST_IDS.FOOD_CATEGORY,
        food: null,
        foodCategory: {
          id: TEST_IDS.FOOD_CATEGORY,
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

      const result = await repository.findByMealAndFoodCategory(
        TEST_IDS.MEAL,
        TEST_IDS.FOOD_CATEGORY,
      );

      expect(result).toEqual(mockItemWithCategory);
      expect(prisma.mealItem.findFirst).toHaveBeenCalledWith({
        where: {
          mealId: TEST_IDS.MEAL,
          foodCategoryId: TEST_IDS.FOOD_CATEGORY,
        },
        include: {
          meal: true,
          food: true,
          foodCategory: true,
        },
      });
    });
  });

  describe('checkForDuplicateItem', () => {
    it('should check for duplicate by food', async () => {
      mockPrismaService.mealItem.findFirst.mockResolvedValue(
        mockMealItemWithFood,
      );

      const result = await repository.checkForDuplicateItem(
        TEST_IDS.MEAL,
        TEST_IDS.FOOD,
        undefined,
      );

      expect(result).toEqual(mockMealItemWithFood);
    });

    it('should check for duplicate by food category', async () => {
      mockPrismaService.mealItem.findFirst.mockResolvedValue(null);

      const result = await repository.checkForDuplicateItem(
        TEST_IDS.MEAL,
        undefined,
        TEST_IDS.FOOD_CATEGORY,
      );

      expect(result).toBeNull();
    });

    it('should return null if neither food nor category provided', async () => {
      const result = await repository.checkForDuplicateItem(
        TEST_IDS.MEAL,
        undefined,
        undefined,
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
          food: true,
          foodCategory: true,
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
