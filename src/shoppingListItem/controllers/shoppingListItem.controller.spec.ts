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
      findByShoppingList: jest.fn(),
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

  describe('findByShoppingList', () => {
    it('placeholder to keep describe block empty after route removal', () => {
      expect(true).toBe(true);
    });
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
});
