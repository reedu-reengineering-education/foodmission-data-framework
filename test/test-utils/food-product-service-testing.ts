import { Test, TestingModule } from '@nestjs/testing';
import { FoodProductService } from '../../src/food-products/services/food-product.service';
import { FoodProductRepository } from '../../src/food-products/repositories/food-product.repository';
import { OpenFoodFactsService } from '../../src/food-products/services/openfoodfacts.service';

export function createMockFoodProductRepository() {
  return {
    findById: jest.fn(),
    findByBarcode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findWithPagination: jest.fn(),
  };
}

export function createMockOpenFoodFactsService() {
  return {
    getProductByBarcode: jest.fn(),
    searchProducts: jest.fn(),
  };
}

export type MockFoodProductRepository = ReturnType<
  typeof createMockFoodProductRepository
>;

export async function compileFoodProductServiceTestingModule(
  repositoryMock = createMockFoodProductRepository(),
  openFoodFactsMock = createMockOpenFoodFactsService(),
): Promise<{
  module: TestingModule;
  service: FoodProductService;
  repository: MockFoodProductRepository;
}> {
  const module = await Test.createTestingModule({
    providers: [
      FoodProductService,
      { provide: FoodProductRepository, useValue: repositoryMock },
      { provide: OpenFoodFactsService, useValue: openFoodFactsMock },
    ],
  }).compile();

  return {
    module,
    service: module.get(FoodProductService),
    repository: module.get(FoodProductRepository),
  };
}
