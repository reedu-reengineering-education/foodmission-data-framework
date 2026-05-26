/** Reusable Jest stub for `FoodProductService` — import from any `*.spec.ts` under `src/` or `test/`. */
export function createMockFoodProductService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByBarcode: jest.fn(),
    searchOpenFoodFacts: jest.fn(),
    importFromOpenFoodFacts: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getOpenFoodFactsInfo: jest.fn(),
  };
}
