import { Test, TestingModule } from '@nestjs/testing';
import { MealItemController } from './meal-item.controller';
import { MealItemService } from '../services/meal-item.service';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CreateMealItemDto } from '../dto/create-meal-item.dto';
import { UpdateMealItemDto } from '../dto/update-meal-item.dto';
import { Unit, MealType } from '@prisma/client';

describe('MealItemController', () => {
  let controller: MealItemController;
  let service: MealItemService;

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
      mealType: MealType.SALAD,
      userId: TEST_IDS.USER,
      calories: 500,
      proteins: 20,
      nutritionalInfo: {},
      sustainabilityScore: null,
      price: null,
      barcode: null,
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

  const mockMealItemService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByMealId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByMealId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MealItemController],
      providers: [
        {
          provide: MealItemService,
          useValue: mockMealItemService,
        },
      ],
    })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<MealItemController>(MealItemController);
    service = module.get<MealItemService>(MealItemService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a meal item', async () => {
      const createDto = Object.assign(new CreateMealItemDto(), {
        foodId: TEST_IDS.FOOD,
        quantity: 2,
        unit: Unit.PIECES,
        notes: 'Test notes',
      });

      mockMealItemService.create.mockResolvedValue(mockMealItemWithFood);

      const result = await controller.create(
        TEST_IDS.MEAL,
        createDto,
        TEST_IDS.USER,
      );

      expect(result).toEqual(mockMealItemWithFood);
      expect(service.create).toHaveBeenCalledWith(createDto, TEST_IDS.USER);
      expect(createDto.mealId).toBe(TEST_IDS.MEAL);
    });
  });

  describe('findByMealId', () => {
    it('should return all items for a meal', async () => {
      const mockItems = [mockMealItemWithFood];
      mockMealItemService.findByMealId.mockResolvedValue(mockItems);

      const result = await controller.findByMealId(
        TEST_IDS.MEAL,
        TEST_IDS.USER,
      );

      expect(result).toEqual(mockItems);
      expect(service.findByMealId).toHaveBeenCalledWith(
        TEST_IDS.MEAL,
        TEST_IDS.USER,
      );
    });
  });

  describe('findById', () => {
    it('should return a meal item by id', async () => {
      mockMealItemService.findById.mockResolvedValue(mockMealItemWithFood);

      const result = await controller.findById(
        TEST_IDS.MEAL_ITEM,
        TEST_IDS.USER,
      );

      expect(result).toEqual(mockMealItemWithFood);
      expect(service.findById).toHaveBeenCalledWith(
        TEST_IDS.MEAL_ITEM,
        TEST_IDS.USER,
      );
    });
  });

  describe('update', () => {
    it('should update a meal item', async () => {
      const updateDto = new UpdateMealItemDto();
      updateDto.quantity = 3;

      const updatedItem = {
        ...mockMealItemWithFood,
        quantity: 3,
      };

      mockMealItemService.update.mockResolvedValue(updatedItem);

      const result = await controller.update(
        TEST_IDS.MEAL_ITEM,
        updateDto,
        TEST_IDS.USER,
      );

      expect(result).toEqual(updatedItem);
      expect(service.update).toHaveBeenCalledWith(
        TEST_IDS.MEAL_ITEM,
        updateDto,
        TEST_IDS.USER,
      );
    });
  });

  describe('delete', () => {
    it('should delete a meal item', async () => {
      mockMealItemService.delete.mockResolvedValue(undefined);

      await controller.delete(TEST_IDS.MEAL_ITEM, TEST_IDS.USER);

      expect(service.delete).toHaveBeenCalledWith(
        TEST_IDS.MEAL_ITEM,
        TEST_IDS.USER,
      );
    });
  });
});
