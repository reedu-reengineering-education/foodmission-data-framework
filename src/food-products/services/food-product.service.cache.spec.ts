import { FoodProductService } from './food-product.service';
import { FoodProductRepository } from '../repositories/food-product.repository';
import { compileFoodProductServiceTestingModule } from '../../../test/test-utils/food-product-service-testing';

describe('FoodProductService cache behavior', () => {
  let service: FoodProductService;
  let repository: jest.Mocked<FoodProductRepository>;

  beforeEach(async () => {
    const setup = await compileFoodProductServiceTestingModule();
    service = setup.service;
    repository =
      setup.repository as unknown as jest.Mocked<FoodProductRepository>;
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
