import { ShoppingListService } from './shoppingList.service';
import { ShoppingListRepository } from '../repositories/shoppingList.repository';

describe('ShoppingListService - Caching Integration', () => {
  let service: ShoppingListService;
  let shoppingListRepository: jest.Mocked<ShoppingListRepository>;


  const mockFood = {
    id: '123',
    title: 'Test shopping list',
  };

  beforeEach(async () => {
    const shoppingListRepository = {
      findById: jest.fn(),
      findByBarcode: jest.fn(),
      findByOpenFoodFactsId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findWithPagination: jest.fn(),
    };

  });
});
