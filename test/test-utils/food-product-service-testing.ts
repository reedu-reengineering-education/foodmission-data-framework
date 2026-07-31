import { Test, TestingModule } from '@nestjs/testing';
import { FoodProductService } from '../../src/food-products/services/food-product.service';
import { FoodProductRepository } from '../../src/food-products/repositories/food-product.repository';
import { OpenFoodFactsService } from '../../src/food-products/services/openfoodfacts.service';
import { TranslationService } from '../../src/translations/services/translation.service';

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

export function createMockTranslationService() {
  return {
    resolveLocale: jest.fn((lang?: string) => {
      const candidate = (lang ?? 'en').trim().toLowerCase();
      const supported = [
        'en',
        'no',
        'de',
        'el',
        'es',
        'it',
        'nl',
        'pl',
        'sl',
      ];
      return supported.includes(candidate) ? candidate : 'en';
    }),
  };
}

export type MockFoodProductRepository = ReturnType<
  typeof createMockFoodProductRepository
>;

export async function compileFoodProductServiceTestingModule(
  repositoryMock = createMockFoodProductRepository(),
  openFoodFactsMock = createMockOpenFoodFactsService(),
  translationMock = createMockTranslationService(),
): Promise<{
  module: TestingModule;
  service: FoodProductService;
  repository: MockFoodProductRepository;
  openFoodFacts: ReturnType<typeof createMockOpenFoodFactsService>;
  translation: ReturnType<typeof createMockTranslationService>;
}> {
  const module = await Test.createTestingModule({
    providers: [
      FoodProductService,
      { provide: FoodProductRepository, useValue: repositoryMock },
      { provide: OpenFoodFactsService, useValue: openFoodFactsMock },
      { provide: TranslationService, useValue: translationMock },
    ],
  }).compile();

  return {
    module,
    service: module.get(FoodProductService),
    repository: module.get(FoodProductRepository),
    openFoodFacts: openFoodFactsMock,
    translation: translationMock,
  };
}
