import { Test, TestingModule } from '@nestjs/testing';
import { FoodProductService } from './food-product.service';
import { FoodProductRepository } from '../repositories/food-product.repository';
import { OpenFoodFactsService } from './openfoodfacts.service';

describe('FoodProductService cache behavior', () => {
  let service: FoodProductService;
  let repository: jest.Mocked<FoodProductRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodProductService,
        {
          provide: FoodProductRepository,
          useValue: {
            findById: jest.fn(),
            findByBarcode: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findWithPagination: jest.fn(),
          },
        },
        {
          provide: OpenFoodFactsService,
          useValue: {
            getProductByBarcode: jest.fn(),
            searchProducts: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(FoodProductService);
    repository = module.get(FoodProductRepository);
  });

  it('findOne reads from repository', async () => {
    repository.findById.mockResolvedValue({
      id: 'food-1',
      name: 'Apple',
      barcode: '123',
    } as any);
    const result = await service.findOne('food-1');
    expect(result.name).toBe('Apple');
    expect(repository.findById).toHaveBeenCalledWith('food-1');
  });
});
