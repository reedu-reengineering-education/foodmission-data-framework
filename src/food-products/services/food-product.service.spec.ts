import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FoodProductService } from './food-product.service';
import { FoodProductRepository } from '../repositories/food-product.repository';
import { OpenFoodFactsService } from './openfoodfacts.service';

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodProductService,
        {
          provide: FoodProductRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByBarcode: jest.fn(),
            findWithPagination: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
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

  afterEach(() => jest.clearAllMocks());

  it('creates food when barcode is unique', async () => {
    repository.findByBarcode.mockResolvedValue(null);
    repository.create.mockResolvedValue(mockFood);

    const result = await service.create({ name: 'Apple', barcode: '123' } as any, 'user-1');

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
});
