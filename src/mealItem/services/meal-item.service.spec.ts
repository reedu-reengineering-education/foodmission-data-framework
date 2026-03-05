import { Test, TestingModule } from '@nestjs/testing';
import { MealItemService } from './meal-item.service';
import { MealItemRepository } from '../repositories/meal-item.repository';
import { MealRepository } from '../../meal/repositories/meal.repository';
import { FoodRepository } from '../../food/repositories/food.repository';
import { FoodCategoryRepository } from '../../foodCategory/repositories/food-category.repository';
import { Unit } from '@prisma/client';
import { CreateMealItemDto } from '../dto/create-meal-item.dto';
import { UpdateMealItemDto } from '../dto/update-meal-item.dto';
import { DatabaseOperationException } from '../../common/exceptions/business.exception';

describe('MealItemService', () => {
  let service: MealItemService;
  let mealItemRepository: MealItemRepository;
  let mealRepository: MealRepository;
  let foodRepository: FoodRepository;
  let foodCategoryRepository: FoodCategoryRepository;

  const TEST_IDS = {
    USER: 'user-uuid-123',
    OTHER_USER: 'other-user-uuid',
    MEAL: 'meal-uuid-123',
    MEAL_ITEM: 'meal-item-uuid-123',
    MEAL_ITEM_2: 'meal-item-uuid-456',
    FOOD: 'food-uuid-123',
    FOOD_2: 'food-uuid-456',
    FOOD_CATEGORY: 'food-category-uuid-123',
    FOOD_CATEGORY_2: 'food-category-uuid-456',
  };

  const mockMeal = {
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
  };

  const mockFood = {
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
  };

  const mockFoodCategory = {
    id: TEST_IDS.FOOD_CATEGORY,
    name: 'Fruits',
    nevoCode: '01.001',
    description: 'Fresh fruits',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
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
    meal: mockMeal,
    food: mockFood,
    foodCategory: null,
  };

  const mockMealItemWithCategory = {
    id: TEST_IDS.MEAL_ITEM_2,
    mealId: TEST_IDS.MEAL,
    itemType: 'food_category',
    foodId: null,
    foodCategoryId: TEST_IDS.FOOD_CATEGORY,
    quantity: 1,
    unit: Unit.G,
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    meal: mockMeal,
    food: null,
    foodCategory: mockFoodCategory,
  };

  const mockMealItemRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByMealId: jest.fn(),
    findById: jest.fn(),
    findByMealAndFood: jest.fn(),
    findByMealAndFoodCategory: jest.fn(),
    checkForDuplicateItem: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByMealId: jest.fn(),
    count: jest.fn(),
  };

  const mockMealRepository = {
    findById: jest.fn(),
  };

  const mockFoodRepository = {
    findById: jest.fn(),
  };

  const mockFoodCategoryRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealItemService,
        {
          provide: MealItemRepository,
          useValue: mockMealItemRepository,
        },
        {
          provide: MealRepository,
          useValue: mockMealRepository,
        },
        {
          provide: FoodRepository,
          useValue: mockFoodRepository,
        },
        {
          provide: FoodCategoryRepository,
          useValue: mockFoodCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<MealItemService>(MealItemService);
    mealItemRepository = module.get<MealItemRepository>(MealItemRepository);
    mealRepository = module.get<MealRepository>(MealRepository);
    foodRepository = module.get<FoodRepository>(FoodRepository);
    foodCategoryRepository = module.get<FoodCategoryRepository>(
      FoodCategoryRepository,
    );

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a meal item with food', async () => {
      const createDto = Object.assign(new CreateMealItemDto(), {
        mealId: TEST_IDS.MEAL,
        foodId: TEST_IDS.FOOD,
        quantity: 2,
        unit: Unit.PIECES,
        notes: 'Test notes',
      });

      mockMealRepository.findById.mockResolvedValue(mockMeal);
      mockFoodRepository.findById.mockResolvedValue(mockFood);
      mockMealItemRepository.findByMealAndFood.mockResolvedValue(null);
      mockMealItemRepository.create.mockResolvedValue(mockMealItemWithFood);

      const result = await service.create(createDto, TEST_IDS.USER);

      expect(result).toEqual(mockMealItemWithFood);
      expect(mealRepository.findById).toHaveBeenCalledWith(TEST_IDS.MEAL);
      expect(foodRepository.findById).toHaveBeenCalledWith(TEST_IDS.FOOD);
      expect(mealItemRepository.findByMealAndFood).toHaveBeenCalledWith(
        TEST_IDS.MEAL,
        TEST_IDS.FOOD,
      );
      expect(mealItemRepository.create).toHaveBeenCalledWith({
        mealId: TEST_IDS.MEAL,
        foodId: TEST_IDS.FOOD,
        foodCategoryId: null,
        itemType: 'food',
        quantity: 2,
        unit: Unit.PIECES,
        notes: 'Test notes',
      });
    });

    it('should create a meal item with food category', async () => {
      const createDto = Object.assign(new CreateMealItemDto(), {
        mealId: TEST_IDS.MEAL,
        foodCategoryId: TEST_IDS.FOOD_CATEGORY,
        quantity: 1,
        unit: Unit.G,
      });

      mockMealRepository.findById.mockResolvedValue(mockMeal);
      mockFoodCategoryRepository.findById.mockResolvedValue(mockFoodCategory);
      mockMealItemRepository.findByMealAndFoodCategory.mockResolvedValue(null);
      mockMealItemRepository.create.mockResolvedValue(mockMealItemWithCategory);

      const result = await service.create(createDto, TEST_IDS.USER);

      expect(result).toEqual(mockMealItemWithCategory);
      expect(foodCategoryRepository.findById).toHaveBeenCalledWith(
        TEST_IDS.FOOD_CATEGORY,
      );
      expect(mealItemRepository.findByMealAndFoodCategory).toHaveBeenCalledWith(
        TEST_IDS.MEAL,
        TEST_IDS.FOOD_CATEGORY,
      );
      expect(mealItemRepository.create).toHaveBeenCalledWith({
        mealId: TEST_IDS.MEAL,
        foodId: null,
        foodCategoryId: TEST_IDS.FOOD_CATEGORY,
        itemType: 'food_category',
        quantity: 1,
        unit: Unit.G,
        notes: null,
      });
    });

    it('should throw DatabaseOperationException if meal does not exist', async () => {
      const createDto = Object.assign(new CreateMealItemDto(), {
        mealId: TEST_IDS.MEAL,
        foodId: TEST_IDS.FOOD,
        quantity: 2,
        unit: Unit.PIECES,
      });

      mockMealRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto, TEST_IDS.USER)).rejects.toThrow(
        DatabaseOperationException,
      );
      expect(mealRepository.findById).toHaveBeenCalledWith(TEST_IDS.MEAL);
    });

    it('should throw DatabaseOperationException if meal belongs to different user', async () => {
      const createDto = Object.assign(new CreateMealItemDto(), {
        mealId: TEST_IDS.MEAL,
        foodId: TEST_IDS.FOOD,
        quantity: 2,
        unit: Unit.PIECES,
      });

      mockMealRepository.findById.mockResolvedValue(mockMeal);

      await expect(
        service.create(createDto, TEST_IDS.OTHER_USER),
      ).rejects.toThrow(DatabaseOperationException);
    });

    it('should throw DatabaseOperationException if food does not exist', async () => {
      const createDto = Object.assign(new CreateMealItemDto(), {
        mealId: TEST_IDS.MEAL,
        foodId: TEST_IDS.FOOD,
        quantity: 2,
        unit: Unit.PIECES,
      });

      mockMealRepository.findById.mockResolvedValue(mockMeal);
      mockFoodRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto, TEST_IDS.USER)).rejects.toThrow(
        DatabaseOperationException,
      );
    });

    it('should throw DatabaseOperationException if food category does not exist', async () => {
      const createDto = Object.assign(new CreateMealItemDto(), {
        mealId: TEST_IDS.MEAL,
        foodCategoryId: TEST_IDS.FOOD_CATEGORY,
        quantity: 1,
        unit: Unit.G,
      });

      mockMealRepository.findById.mockResolvedValue(mockMeal);
      mockFoodCategoryRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto, TEST_IDS.USER)).rejects.toThrow(
        DatabaseOperationException,
      );
    });

    it('should throw DatabaseOperationException if food already exists in meal', async () => {
      const createDto = Object.assign(new CreateMealItemDto(), {
        mealId: TEST_IDS.MEAL,
        foodId: TEST_IDS.FOOD,
        quantity: 2,
        unit: Unit.PIECES,
      });

      mockMealRepository.findById.mockResolvedValue(mockMeal);
      mockFoodRepository.findById.mockResolvedValue(mockFood);
      mockMealItemRepository.findByMealAndFood.mockResolvedValue(
        mockMealItemWithFood,
      );

      await expect(service.create(createDto, TEST_IDS.USER)).rejects.toThrow(
        DatabaseOperationException,
      );
    });

    it('should throw DatabaseOperationException if food category already exists in meal', async () => {
      const createDto = Object.assign(new CreateMealItemDto(), {
        mealId: TEST_IDS.MEAL,
        foodCategoryId: TEST_IDS.FOOD_CATEGORY,
        quantity: 1,
        unit: Unit.G,
      });

      mockMealRepository.findById.mockResolvedValue(mockMeal);
      mockFoodCategoryRepository.findById.mockResolvedValue(mockFoodCategory);
      mockMealItemRepository.findByMealAndFoodCategory.mockResolvedValue(
        mockMealItemWithCategory,
      );

      await expect(service.create(createDto, TEST_IDS.USER)).rejects.toThrow(
        DatabaseOperationException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all meal items', async () => {
      const mockItems = [mockMealItemWithFood, mockMealItemWithCategory];
      mockMealItemRepository.findAll.mockResolvedValue(mockItems);

      const result = await service.findAll();

      expect(result).toEqual(mockItems);
      expect(mealItemRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('findByMealId', () => {
    it('should return all items for a meal', async () => {
      const mockItems = [mockMealItemWithFood, mockMealItemWithCategory];
      mockMealRepository.findById.mockResolvedValue(mockMeal);
      mockMealItemRepository.findByMealId.mockResolvedValue(mockItems);

      const result = await service.findByMealId(TEST_IDS.MEAL, TEST_IDS.USER);

      expect(result).toEqual(mockItems);
      expect(mealRepository.findById).toHaveBeenCalledWith(TEST_IDS.MEAL);
      expect(mealItemRepository.findByMealId).toHaveBeenCalledWith(
        TEST_IDS.MEAL,
      );
    });

    it('should throw DatabaseOperationException if meal does not exist', async () => {
      mockMealRepository.findById.mockResolvedValue(null);

      await expect(
        service.findByMealId(TEST_IDS.MEAL, TEST_IDS.USER),
      ).rejects.toThrow(DatabaseOperationException);
    });

    it('should throw DatabaseOperationException if meal belongs to different user', async () => {
      mockMealRepository.findById.mockResolvedValue(mockMeal);

      await expect(
        service.findByMealId(TEST_IDS.MEAL, TEST_IDS.OTHER_USER),
      ).rejects.toThrow(DatabaseOperationException);
    });
  });

  describe('findById', () => {
    it('should return a meal item by id', async () => {
      mockMealItemRepository.findById.mockResolvedValue(mockMealItemWithFood);
      mockMealRepository.findById.mockResolvedValue(mockMeal);

      const result = await service.findById(TEST_IDS.MEAL_ITEM, TEST_IDS.USER);

      expect(result).toEqual(mockMealItemWithFood);
      expect(mealItemRepository.findById).toHaveBeenCalledWith(
        TEST_IDS.MEAL_ITEM,
      );
    });

    it('should throw DatabaseOperationException if meal item does not exist', async () => {
      mockMealItemRepository.findById.mockResolvedValue(null);

      await expect(
        service.findById(TEST_IDS.MEAL_ITEM, TEST_IDS.USER),
      ).rejects.toThrow(DatabaseOperationException);
    });

    it('should throw DatabaseOperationException if meal belongs to different user', async () => {
      mockMealItemRepository.findById.mockResolvedValue(mockMealItemWithFood);
      mockMealRepository.findById.mockResolvedValue(mockMeal);

      await expect(
        service.findById(TEST_IDS.MEAL_ITEM, TEST_IDS.OTHER_USER),
      ).rejects.toThrow(DatabaseOperationException);
    });
  });

  describe('update', () => {
    it('should update a meal item quantity and unit', async () => {
      const updateDto = new UpdateMealItemDto();
      updateDto.quantity = 3;
      updateDto.unit = Unit.G;

      const updatedItem = {
        ...mockMealItemWithFood,
        quantity: 3,
        unit: Unit.G,
      };

      mockMealItemRepository.findById.mockResolvedValue(mockMealItemWithFood);
      mockMealRepository.findById.mockResolvedValue(mockMeal);
      mockMealItemRepository.update.mockResolvedValue(updatedItem);

      const result = await service.update(
        TEST_IDS.MEAL_ITEM,
        updateDto,
        TEST_IDS.USER,
      );

      expect(result).toEqual(updatedItem);
      expect(mealItemRepository.update).toHaveBeenCalledWith(
        TEST_IDS.MEAL_ITEM,
        expect.objectContaining({
          itemType: 'food',
          quantity: 3,
          unit: Unit.G,
          notes: 'Test notes',
        }),
      );
    });

    it('should update meal item notes', async () => {
      const updateDto = new UpdateMealItemDto();
      updateDto.notes = 'Updated notes';

      const updatedItem = {
        ...mockMealItemWithFood,
        notes: 'Updated notes',
      };

      mockMealItemRepository.findById.mockResolvedValue(mockMealItemWithFood);
      mockMealRepository.findById.mockResolvedValue(mockMeal);
      mockMealItemRepository.update.mockResolvedValue(updatedItem);

      const result = await service.update(
        TEST_IDS.MEAL_ITEM,
        updateDto,
        TEST_IDS.USER,
      );

      expect(result.notes).toBe('Updated notes');
    });

    it('should throw DatabaseOperationException if meal item does not exist', async () => {
      const updateDto = new UpdateMealItemDto();
      updateDto.quantity = 3;

      mockMealItemRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(TEST_IDS.MEAL_ITEM, updateDto, TEST_IDS.USER),
      ).rejects.toThrow(DatabaseOperationException);
    });
  });

  describe('delete', () => {
    it('should delete a meal item', async () => {
      mockMealItemRepository.findById.mockResolvedValue(mockMealItemWithFood);
      mockMealRepository.findById.mockResolvedValue(mockMeal);
      mockMealItemRepository.delete.mockResolvedValue(undefined);

      await service.delete(TEST_IDS.MEAL_ITEM, TEST_IDS.USER);

      expect(mealItemRepository.delete).toHaveBeenCalledWith(
        TEST_IDS.MEAL_ITEM,
      );
    });

    it('should throw DatabaseOperationException if meal item does not exist', async () => {
      mockMealItemRepository.findById.mockResolvedValue(null);

      await expect(
        service.delete(TEST_IDS.MEAL_ITEM, TEST_IDS.USER),
      ).rejects.toThrow(DatabaseOperationException);
    });
  });

  describe('deleteByMealId', () => {
    it('should delete all items for a meal', async () => {
      mockMealRepository.findById.mockResolvedValue(mockMeal);
      mockMealItemRepository.deleteByMealId.mockResolvedValue(undefined);

      await service.deleteByMealId(TEST_IDS.MEAL, TEST_IDS.USER);

      expect(mealItemRepository.deleteByMealId).toHaveBeenCalledWith(
        TEST_IDS.MEAL,
      );
    });

    it('should throw DatabaseOperationException if meal does not exist', async () => {
      mockMealRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteByMealId(TEST_IDS.MEAL, TEST_IDS.USER),
      ).rejects.toThrow(DatabaseOperationException);
    });

    it('should throw DatabaseOperationException if meal belongs to different user', async () => {
      mockMealRepository.findById.mockResolvedValue(mockMeal);

      await expect(
        service.deleteByMealId(TEST_IDS.MEAL, TEST_IDS.OTHER_USER),
      ).rejects.toThrow(DatabaseOperationException);
    });
  });
});
