import { PantryService } from '../services/pantry.service';
import { MockService } from '../../common/test-utils/type-helpers';

export function createMockPantryService(): MockService<PantryService> {
  return {
    create: jest.fn(),
    getAllPantriesByUserId: jest.fn(),
    getPantryById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    validatePantryExists: jest.fn(),
  } as MockService<PantryService>;
}

