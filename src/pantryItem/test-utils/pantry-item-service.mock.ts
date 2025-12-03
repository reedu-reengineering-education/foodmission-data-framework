import { PantryItemService } from '../services/pantryItem.service';
import { MockService } from '../../common/test-utils/type-helpers';

export function createMockPantryItemService(): MockService<PantryItemService> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createFromShoppingList: jest.fn(),
  } as MockService<PantryItemService>;
}

