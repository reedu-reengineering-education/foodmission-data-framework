import { Unit } from '@prisma/client';
import {
  TEST_IDS,
  TEST_DATA,
  TEST_DATES,
} from '../../common/test-utils/test-constants';

export function createMockPantryItemRepository() {
  return {
    create: jest.fn(),
    findFoodProductInPantry: jest.fn(),
    findGenericFoodInPantry: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

export function createMockPantryService() {
  return {
    validatePantryExists: jest.fn(),
  };
}

export function createMockGenericFoodRepository() {
  return {
    findById: jest.fn(),
  };
}

export function createMockFoodProductRepository() {
  return {
    findById: jest.fn(),
  };
}

export function createMockShelfLifeService() {
  return {
    calculateExpiryDate: jest.fn().mockResolvedValue({
      expiryDate: null,
      source: null,
    }),
    inferStorageType: jest.fn().mockReturnValue('refrigerator'),
    getDaysForStorageType: jest.fn().mockReturnValue(7),
    resolveExpiryDate: jest
      .fn()
      .mockResolvedValue({ expiryDate: undefined, source: undefined }),
  };
}

export function createMockPantryItemWithRelations() {
  return {
    id: TEST_IDS.PANTRY_ITEM,
    quantity: TEST_DATA.QUANTITY,
    unit: Unit.KG,
    notes: TEST_DATA.NOTES,
    expiryDate: TEST_DATES.EXPIRY,
    pantryId: TEST_IDS.PANTRY,
    foodProductId: TEST_IDS.FOOD,
    genericFoodId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    pantry: {
      id: TEST_IDS.PANTRY,
      title: 'My Pantry',
      userId: TEST_IDS.USER,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    foodProduct: {
      id: TEST_IDS.FOOD,
      name: 'Tomatoes',
      category: 'Vegetables',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    genericFood: null,
  };
}

export function setupSuccessfulCreateMocks({
  mockPantryService,
  mockFoodRepository,
  mockPantryItemRepository,
}) {
  mockPantryService.validatePantryExists.mockResolvedValue(TEST_IDS.PANTRY);
  mockFoodRepository.findById.mockResolvedValue({
    id: TEST_IDS.FOOD,
    name: 'Tomatoes',
  });
  mockPantryItemRepository.findFoodProductInPantry.mockResolvedValue(null);
}
