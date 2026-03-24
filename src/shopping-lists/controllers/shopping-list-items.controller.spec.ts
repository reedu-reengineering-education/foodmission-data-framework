import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { ShoppingListItemsController } from './shopping-list-items.controller';
import { ShoppingListItemService } from '../services/shopping-list-items.service';
import { TEST_FOOD } from '../../../test/fixtures/food.fixtures';
import { Unit } from '@prisma/client';

describe('ShoppingListItemsController', () => {
  let controller: ShoppingListItemsController;
  let service: jest.Mocked<ShoppingListItemService>;

  const mockItemResponse = {
    id: 'item-1',
    shoppingListId: 'list-1',
    foodId: TEST_FOOD.id,
    quantity: 2,
    unit: 'KG',
    checked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const shoppingListId = 'list-1';
  const itemId = 'item-1';

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<ShoppingListItemService>> = {
      findById: jest.fn(),
      findByShoppingList: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      toggleChecked: jest.fn(),
      remove: jest.fn(),
      clearCheckedItems: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShoppingListItemsController],
      providers: [
        {
          provide: ShoppingListItemService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ShoppingListItemsController>(
      ShoppingListItemsController,
    );
    service = module.get(ShoppingListItemService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByShoppingList', () => {
    it('should call service with shoppingListId and userId', async () => {
      service.findByShoppingList.mockResolvedValueOnce({ data: [] } as any);

      await controller.findByShoppingList(shoppingListId, {}, 'user-1');

      expect(service.findByShoppingList).toHaveBeenCalledWith(
        shoppingListId,
        'user-1',
        expect.any(Object),
      );
    });
  });

  describe('findById', () => {
    it('should call service with id, userId, and shoppingListId', async () => {
      service.findById.mockResolvedValueOnce(mockItemResponse as any);

      const result = await controller.findById(
        shoppingListId,
        itemId,
        'user-1',
      );

      expect(result).toEqual(mockItemResponse);
      expect(service.findById).toHaveBeenCalledWith(
        itemId,
        'user-1',
        shoppingListId,
      );
    });
  });

  describe('update', () => {
    it('should call service with id, dto, userId, and shoppingListId', async () => {
      const updateDto = { quantity: 3 };
      service.update = jest.fn().mockResolvedValue(mockItemResponse as any);

      const result = await controller.update(
        shoppingListId,
        itemId,
        updateDto as any,
        'user-1',
      );

      expect(result).toEqual(mockItemResponse);
      expect(service.update).toHaveBeenCalledWith(
        itemId,
        updateDto,
        'user-1',
        shoppingListId,
      );
    });
  });

  describe('toggleChecked', () => {
    it('should call service with id, userId, and shoppingListId', async () => {
      service.toggleChecked = jest
        .fn()
        .mockResolvedValue(mockItemResponse as any);

      const result = await controller.toggleChecked(
        shoppingListId,
        itemId,
        'user-1',
      );

      expect(result).toEqual(mockItemResponse);
      expect(service.toggleChecked).toHaveBeenCalledWith(
        itemId,
        'user-1',
        shoppingListId,
      );
    });
  });

  describe('remove', () => {
    it('should call service with id, userId, and shoppingListId', async () => {
      service.remove = jest.fn().mockResolvedValue(undefined);

      const result = await controller.remove(shoppingListId, itemId, 'user-1');

      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(
        itemId,
        'user-1',
        shoppingListId,
      );
    });
  });

  describe('clearCheckedItems', () => {
    it('should call service with shoppingListId and userId', async () => {
      service.clearCheckedItems = jest.fn().mockResolvedValue(undefined);

      const result = await controller.clearCheckedItems(
        shoppingListId,
        'user-1',
      );

      expect(result).toBeUndefined();
      expect(service.clearCheckedItems).toHaveBeenCalledWith(
        shoppingListId,
        'user-1',
      );
    });
  });

  describe('create', () => {
    it('should add an item to the shopping list', async () => {
      const createDto = {
        quantity: 2,
        unit: Unit.KG,
        notes: 'Test notes',
        checked: false,
        foodId: 'food-1',
      };

      const mockResponse = {
        id: 'item-1',
        shoppingListId,
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.create = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.create(
        shoppingListId,
        createDto as any,
        'user-1',
      );

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ shoppingListId, ...createDto }),
        'user-1',
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
