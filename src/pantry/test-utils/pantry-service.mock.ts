import { PantryService } from '../services/pantry.service';
import { MockService } from '../../common/test-utils/type-helpers';

export function createMockPantryService(): MockService<PantryService> {
  return {
    getPantryByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    validatePantryExists: jest.fn(),
  } as MockService<PantryService>;
}
