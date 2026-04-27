import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FoodProductController } from './food-products.controller';
import { FoodProductService } from '../services/food-product.service';
import { UserContextService } from '../../auth/user-context.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CacheInterceptor } from '../../cache/cache.interceptor';
import { CacheEvictInterceptor } from '../../cache/cache-evict.interceptor';

describe('FoodProductController', () => {
  let controller: FoodProductController;
  let service: jest.Mocked<FoodProductService>;

  beforeEach(async () => {
    const mockService = {
      findOne: jest.fn(),
      findByBarcode: jest.fn(),
      searchOpenFoodFacts: jest.fn(),
      importFromOpenFoodFacts: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getOpenFoodFactsInfo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodProductController],
      providers: [
        { provide: FoodProductService, useValue: mockService },
        { provide: UserContextService, useValue: {} },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(CacheInterceptor)
      .useValue({ intercept: (_c: any, n: any) => n.handle() })
      .overrideInterceptor(CacheEvictInterceptor)
      .useValue({ intercept: (_c: any, n: any) => n.handle() })
      .compile();

    controller = module.get(FoodProductController);
    service = module.get(FoodProductService);
  });

  it('findOne passes includeOpenFoodFacts=false by default', async () => {
    service.findOne.mockResolvedValue({ id: 'food-1' } as any);
    await controller.findOne('food-1', undefined);
    expect(service.findOne).toHaveBeenCalledWith('food-1', false);
  });

  it('findByBarcode passes includeOpenFoodFacts=true when query is true', async () => {
    service.findByBarcode.mockResolvedValue({ id: 'food-1' } as any);
    await controller.findByBarcode('123', 'true');
    expect(service.findByBarcode).toHaveBeenCalledWith('123', true);
  });

  it('propagates not found from service', async () => {
    service.findOne.mockRejectedValue(new NotFoundException('Food not found'));
    await expect(controller.findOne('missing', undefined)).rejects.toThrow(
      NotFoundException,
    );
  });
});
