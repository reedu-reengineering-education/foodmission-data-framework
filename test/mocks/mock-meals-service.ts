/** Reusable Jest stub for `MealsService` — import from any `*.spec.ts` under `src/` or `test/`. */
export function createMockMealsService(overrides = {}) {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  };
}
