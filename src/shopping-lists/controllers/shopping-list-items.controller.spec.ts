import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { ShoppingListItemsController } from './shopping-list-items.controller';
import { ShoppingListItemService } from '../services/shopping-list-items.service';

describe('ShoppingListItemsController', () => {
  let controller: ShoppingListItemsController;
  let service: jest.Mocked<ShoppingListItemService>;

  const shoppingListId = '98e6c344-5fbe-400c-a682-ecca1e5fbfe4';
  const itemId = 'e4e562a0-5e11-4f7f-b951-7fce2d2686d1';

  const mockItemResponse: any = {
    id: itemId,
    shoppingListId,
    checked: false,
    quantity: 1,
    unit: 'KG',
    itemType: 'food_product',
    foodProductId: 'food-1',
    genericFoodId: null,
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<ShoppingListItemService>> = {
      findById: jest.fn(),
      findByShoppingList: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      clearCheckedItems: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShoppingListItemsController],
      providers: [{ provide: ShoppingListItemService, useValue: mockService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ShoppingListItemsController);
    service = module.get(ShoppingListItemService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('passes checked attribute through patch update', async () => {
    service.update.mockResolvedValue({ checked: true } as any);

    await controller.update(
      shoppingListId,
      itemId,
      { checked: true },
      'user-1',
    );

    expect(service.update).toHaveBeenCalledWith(
      itemId,
      { checked: true },
      'user-1',
      shoppingListId,
    );
  });

  describe('findByShoppingList', () => {
    it('should call service with shoppingListId and userId', async () => {
      service.findByShoppingList.mockResolvedValueOnce({ data: [] });

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
        updateDto,
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

    it('should pass checked attribute through patch update', async () => {
      const updateDto = { checked: true };
      const checkedResponse = { ...mockItemResponse, checked: true };
      service.update = jest.fn().mockResolvedValue(checkedResponse);

      const result = await controller.update(
        shoppingListId,
        itemId,
        updateDto,
        'user-1',
      );

      expect(result.checked).toBe(true);
      expect(service.update).toHaveBeenCalledWith(
        itemId,
        { checked: true },
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
    });
  });
});
