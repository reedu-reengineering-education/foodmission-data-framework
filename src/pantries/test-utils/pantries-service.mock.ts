import { PantryService } from '../services/pantries.service';
import { MockService } from '../../common/test-utils/type-helpers';

export function createMockPantriesService(): MockService<PantryService> {
  return {
    getOrCreatePantry: jest.fn(),
    validatePantryExists: jest.fn(),
  } as MockService<PantryService>;
}
