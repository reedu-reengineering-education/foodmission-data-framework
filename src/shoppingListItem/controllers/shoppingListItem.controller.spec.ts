import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { ShoppingListItemController } from './shoppingListItem.controller';
import { ShoppingListItemService } from '../services/shoppingListItem.service';

describe('ShoppingListItemController', () => {
  let controller: ShoppingListItemController;
  let service: jest.Mocked<ShoppingListItemService>;

  const mockItemResponse = {
    id: 'item-1',
    shoppingListId: 'list-1',
    foodId: 'food-1',
    quantity: 2,
    unit: 'KG',
    checked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<ShoppingListItemService>> = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShoppingListItemController],
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

    controller = module.get<ShoppingListItemController>(
      ShoppingListItemController,
    );
    service = module.get(ShoppingListItemService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should call service with id and userId and return result', async () => {
      const id = 'item-1';
      const userId = 'user-1';

      service.findById.mockResolvedValueOnce(mockItemResponse as any);

      const result = await controller.findById(id, userId);

      expect(result).toEqual(mockItemResponse);
      expect(service.findById).toHaveBeenCalledWith(id, userId);
    });
  });

  describe('update', () => {
    it('should call service with id, dto, and userId', async () => {
      const id = 'item-1';
      const userId = 'user-1';
      const updateDto = { quantity: 3 };
      service.update = jest.fn().mockResolvedValue(mockItemResponse as any);

      const result = await controller.update(id, updateDto as any, userId);

      expect(result).toEqual(mockItemResponse);
      expect(service.update).toHaveBeenCalledWith(id, updateDto, userId);
    });
  });

  describe('toggleChecked', () => {
    it('should call service with id and userId', async () => {
      const id = 'item-1';
      const userId = 'user-1';
      service.toggleChecked = jest
        .fn()
        .mockResolvedValue(mockItemResponse as any);

      const result = await controller.toggleChecked(id, userId);

      expect(result).toEqual(mockItemResponse);
      expect(service.toggleChecked).toHaveBeenCalledWith(id, userId);
    });
  });

  describe('remove', () => {
    it('should call service with id and userId', async () => {
      const id = 'item-1';
      const userId = 'user-1';
      service.remove = jest.fn().mockResolvedValue(undefined);

      const result = await controller.remove(id, userId);

      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(id, userId);
    });
  });

  describe('clearCheckedItems', () => {
    it('should call service with shoppingListId and userId', async () => {
      const shoppingListId = 'list-1';
      const userId = 'user-1';
      service.clearCheckedItems = jest.fn().mockResolvedValue(undefined);

      const result = await controller.clearCheckedItems(shoppingListId, userId);

      expect(result).toBeUndefined();
      expect(service.clearCheckedItems).toHaveBeenCalledWith(
        shoppingListId,
        userId,
      );
    });
  });
});
