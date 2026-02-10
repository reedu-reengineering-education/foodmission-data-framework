import { PantryService } from '../services/pantry.service';
import { MockService } from '../../common/test-utils/type-helpers';

export function createMockPantryService(): MockService<PantryService> {
  return {
    getPantryByUserId: jest.fn(),
    updateUserPantry: jest.fn(),
    deleteUserPantry: jest.fn(),
    create: jest.fn(),
    validatePantryExists: jest.fn(),
  } as MockService<PantryService>;
}
