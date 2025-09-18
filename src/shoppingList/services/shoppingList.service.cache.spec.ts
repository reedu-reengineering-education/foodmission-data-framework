import { ShoppingListService } from './shoppingList.service';
import { ShoppingListRepository } from '../repositories/shoppingList.repository';

describe('ShoppingListService - Caching Integration', () => {
  let service: ShoppingListService;
  let shoppingListRepository: jest.Mocked<ShoppingListRepository>;

  const mockShoppingList = {
    id: '123',
    title: 'Test shopping list',
  };

  beforeEach(async () => {
    const shoppingListRepository = {
      findById: jest.fn(),
      findByAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });
});
