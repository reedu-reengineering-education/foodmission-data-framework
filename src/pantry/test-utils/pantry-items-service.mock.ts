import { PantryItemService } from '../services/pantry-items.service';
import { MockService } from '../../common/test-utils/type-helpers';

export function createMockPantryItemsService(): MockService<PantryItemService> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createFromShoppingList: jest.fn(),
    detectExpiredItems: jest.fn(),
    batchCreateWaste: jest.fn(),
  } as MockService<PantryItemService>;
}
