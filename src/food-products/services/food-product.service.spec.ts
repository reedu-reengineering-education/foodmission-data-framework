import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FoodProductService } from './food-product.service';
import { FoodProductRepository } from '../repositories/food-product.repository';
import { compileFoodProductServiceTestingModule } from '../../../test/test-utils/food-product-service-testing';

describe('FoodProductService', () => {
  let service: FoodProductService;
  let repository: jest.Mocked<FoodProductRepository>;

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
