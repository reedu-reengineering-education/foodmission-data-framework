export function createMockMealItemService(overrides = {}) {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findByMealId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByMealId: jest.fn(),
    ...overrides,
  };
}
