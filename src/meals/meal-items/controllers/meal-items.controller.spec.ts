import { Test, TestingModule } from '@nestjs/testing';
import { MealItemController } from './meal-items.controller';
import { MealItemService } from '../services/meal-items.service';
import { DataBaseAuthGuard } from '../../../common/guards/database-auth.guards';
import { CreateMealItemDto } from '../dto/create-meal-item.dto';
import { UpdateMealItemDto } from '../dto/update-meal-item.dto';
import { Unit } from '@prisma/client';
import { TEST_MEAL_ITEM_WITH_FOOD } from '../../../../test/fixtures/meal-item.fixtures';
import { createMockMealItemService } from '../../../common/testing/mock-meal-item-service';
import { MEAL_ITEM_TEST_IDS as TEST_IDS } from '../test-utils/meal-item-test-ids';

describe('MealItemController', () => {
  let controller: MealItemController;
  let service: MealItemService;

  const mockMealItemWithFood = TEST_MEAL_ITEM_WITH_FOOD;

  const mockMealItemService = createMockMealItemService();

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
        foodProductId: TEST_IDS.FOOD_PRODUCT,
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
