import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseOperationException } from '../../../common/exceptions/business.exception';
import { MealItemService } from './meal-items.service';
import { MealItemRepository } from '../repositories/meal-items.repository';
import { MealsRepository } from '../../repositories/meals.repository';
import { FoodProductRepository } from '../../../food-products/repositories/food-product.repository';
import { GenericFoodRepository } from '../../../generic-foods/repositories/generic-food.repository';
import { Unit } from '@prisma/client';
import { MEAL_ITEM_TEST_IDS as TEST_IDS } from '../test-utils/meal-item-test-ids';

describe('MealItemService', () => {
  let service: MealItemService;
  const mealItemRepository = {
    create: jest.fn(),
    findByMealAndFoodProduct: jest.fn(),
    findByMealAndGenericFood: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };
  const mealRepository = { findById: jest.fn() };
  const foodProductRepository = { findById: jest.fn() };
  const genericFoodRepository = { findById: jest.fn() };

  const meal = { id: TEST_IDS.MEAL, userId: TEST_IDS.USER };
  const existingItem = {
    id: TEST_IDS.MEAL_ITEM,
    mealId: TEST_IDS.MEAL,
    itemType: 'food_product',
    foodProductId: TEST_IDS.FOOD_PRODUCT,
    genericFoodId: null,
    quantity: 1,
    unit: Unit.G,
    notes: null,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealItemService,
        { provide: MealItemRepository, useValue: mealItemRepository },
        { provide: MealsRepository, useValue: mealRepository },
        { provide: FoodProductRepository, useValue: foodProductRepository },
        { provide: GenericFoodRepository, useValue: genericFoodRepository },
      ],
    }).compile();
    service = module.get(MealItemService);
    jest.clearAllMocks();
  });

  it('creates meal item with foodProductId', async () => {
    mealRepository.findById.mockResolvedValue(meal);
    foodProductRepository.findById.mockResolvedValue({
      id: TEST_IDS.FOOD_PRODUCT,
    });
    mealItemRepository.findByMealAndFoodProduct.mockResolvedValue(null);
    mealItemRepository.create.mockResolvedValue(existingItem);

    await service.create(
      {
        mealId: TEST_IDS.MEAL,
        foodProductId: TEST_IDS.FOOD_PRODUCT,
        quantity: 1,
        unit: Unit.G,
      } as any,
      TEST_IDS.USER,
    );

    expect(mealItemRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        foodProductId: TEST_IDS.FOOD_PRODUCT,
        itemType: 'food_product',
      }),
    );
  });

  it('wraps duplicate genericFood conflict as database operation error', async () => {
    mealRepository.findById.mockResolvedValue(meal);
    genericFoodRepository.findById.mockResolvedValue({
      id: TEST_IDS.GENERIC_FOOD,
    });
    mealItemRepository.findByMealAndGenericFood.mockResolvedValue({
      id: 'dup',
    });

    await expect(
      service.create(
        {
          mealId: TEST_IDS.MEAL,
          genericFoodId: TEST_IDS.GENERIC_FOOD,
          quantity: 1,
          unit: Unit.G,
        } as any,
        TEST_IDS.USER,
      ),
    ).rejects.toThrow(DatabaseOperationException);
  });

  it('updates an existing item', async () => {
    mealItemRepository.findById.mockResolvedValue(existingItem);
    mealRepository.findById.mockResolvedValue(meal);
    mealItemRepository.update.mockResolvedValue({
      ...existingItem,
      quantity: 3,
    });

    const result = await service.update(
      TEST_IDS.MEAL_ITEM,
      { quantity: 3 } as any,
      TEST_IDS.USER,
    );

    expect(result.quantity).toBe(3);
    expect(mealItemRepository.update).toHaveBeenCalled();
  });

  it('wraps missing meal as database operation error', async () => {
    mealRepository.findById.mockResolvedValue(null);

    await expect(
      service.create(
        {
          mealId: TEST_IDS.MEAL,
          foodProductId: TEST_IDS.FOOD_PRODUCT,
          quantity: 1,
          unit: Unit.G,
        } as any,
        TEST_IDS.USER,
      ),
    ).rejects.toThrow(DatabaseOperationException);
  });
});
