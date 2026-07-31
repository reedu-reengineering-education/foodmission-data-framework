import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FoodProductService } from './food-product.service';
import { FoodProductRepository } from '../repositories/food-product.repository';
import { compileFoodProductServiceTestingModule } from '../../../test/test-utils/food-product-service-testing';

describe('FoodProductService', () => {
  let service: FoodProductService;
  let repository: jest.Mocked<FoodProductRepository>;
  let openFoodFacts: {
    getProductByBarcode: jest.Mock;
    searchProducts: jest.Mock;
  };

  const mockFood = {
    id: 'food-1',
    name: 'Apple',
    barcode: '123',
    createdBy: 'user-1',
  } as any;

  beforeEach(async () => {
    const setup = await compileFoodProductServiceTestingModule();
    service = setup.service;
    repository =
      setup.repository as unknown as jest.Mocked<FoodProductRepository>;
    openFoodFacts = setup.openFoodFacts;
  });

  afterEach(() => jest.clearAllMocks());

  it('creates food when barcode is unique', async () => {
    repository.findByBarcode.mockResolvedValue(null);
    repository.create.mockResolvedValue(mockFood);

    const result = await service.create(
      { name: 'Apple', barcode: '123' },
      'user-1',
    );

    expect(result.name).toBe('Apple');
    expect(repository.create).toHaveBeenCalled();
  });

  it('throws when barcode already exists', async () => {
    repository.findByBarcode.mockResolvedValue(mockFood);
    await expect(
      service.create({ name: 'Apple', barcode: '123' } as any, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when finding missing food by id', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  describe('findByBarcode lang', () => {
    it('passes resolved locale to OpenFoodFactsService', async () => {
      openFoodFacts.getProductByBarcode.mockResolvedValue({
        barcode: '123',
        name: 'Nougatcreme',
        genericName: 'Haselnusscreme',
      });

      const result = await service.findByBarcode('123', 'de');

      expect(openFoodFacts.getProductByBarcode).toHaveBeenCalledWith(
        '123',
        'de',
      );
      expect(result.name).toBe('Nougatcreme');
    });

    it('defaults to en when lang omitted', async () => {
      openFoodFacts.getProductByBarcode.mockResolvedValue({
        barcode: '123',
        name: 'Nutella',
      });

      await service.findByBarcode('123');

      expect(openFoodFacts.getProductByBarcode).toHaveBeenCalledWith(
        '123',
        'en',
      );
    });
  });

  describe('searchOpenFoodFacts lang', () => {
    it('includes resolved lang in search options', async () => {
      openFoodFacts.searchProducts.mockResolvedValue({
        products: [],
        totalCount: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      await service.searchOpenFoodFacts({ query: 'nutella', lang: 'de' });

      expect(openFoodFacts.searchProducts).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'nutella', lang: 'de' }),
      );
    });
  });

  describe('importFromOpenFoodFacts', () => {
    it('always imports with English locale', async () => {
      repository.findByBarcode.mockResolvedValue(null);
      openFoodFacts.getProductByBarcode.mockResolvedValue({
        barcode: '999',
        name: 'Nutella',
        genericName: 'Hazelnut spread',
      });
      repository.create.mockResolvedValue({
        id: 'imported',
        name: 'Nutella',
        barcode: '999',
      } as any);

      await service.importFromOpenFoodFacts('999', 'user-1');

      expect(openFoodFacts.getProductByBarcode).toHaveBeenCalledWith(
        '999',
        'en',
      );
    });
  });

  describe('remove', () => {
    it('deletes food product when it exists', async () => {
      repository.findById.mockResolvedValue(mockFood);
      repository.delete.mockResolvedValue(undefined);

      await service.remove('food-1');

      expect(repository.findById).toHaveBeenCalledWith('food-1');
      expect(repository.delete).toHaveBeenCalledWith('food-1');
    });

    it('throws NotFoundException when food product does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
