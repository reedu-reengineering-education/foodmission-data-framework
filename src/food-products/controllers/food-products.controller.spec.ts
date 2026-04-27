import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FoodProductController } from './food-products.controller';
import { FoodProductService } from '../services/food-product.service';
import { UserContextService } from '../../auth/user-context.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CacheInterceptor } from '../../cache/cache.interceptor';
import { CacheEvictInterceptor } from '../../cache/cache-evict.interceptor';
import { createMockFoodProductService } from '../../../test/mocks/mock-food-product-service';
import { TEST_FOOD } from '../../../test/fixtures/food.fixtures';

describe('FoodProductController', () => {
  let controller: FoodProductController;
  let service: jest.Mocked<FoodProductService>;

  const foodDto = {
    id: TEST_FOOD.id,
    name: TEST_FOOD.name,
    barcode: TEST_FOOD.barcode,
  } as any;

  beforeEach(async () => {
    const mockService = createMockFoodProductService();

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('passes includeOpenFoodFacts=false when query omitted', async () => {
      service.findOne.mockResolvedValue(foodDto);
      await controller.findOne(TEST_FOOD.id, undefined);
      expect(service.findOne).toHaveBeenCalledWith(TEST_FOOD.id, false);
    });

    it('passes includeOpenFoodFacts=true when query is "true"', async () => {
      service.findOne.mockResolvedValue(foodDto);
      await controller.findOne(TEST_FOOD.id, 'true');
      expect(service.findOne).toHaveBeenCalledWith(TEST_FOOD.id, true);
    });

    it('propagates NotFoundException from service', async () => {
      service.findOne.mockRejectedValue(new NotFoundException('Food not found'));
      await expect(controller.findOne(TEST_FOOD.id, undefined)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByBarcode', () => {
    it('passes includeOpenFoodFacts=false by default', async () => {
      service.findByBarcode.mockResolvedValue(foodDto);
      await controller.findByBarcode(TEST_FOOD.barcode!, undefined);
      expect(service.findByBarcode).toHaveBeenCalledWith(TEST_FOOD.barcode, false);
    });

    it('passes includeOpenFoodFacts=true when query is "true"', async () => {
      service.findByBarcode.mockResolvedValue(foodDto);
      await controller.findByBarcode(TEST_FOOD.barcode!, 'true');
      expect(service.findByBarcode).toHaveBeenCalledWith(TEST_FOOD.barcode, true);
    });
  });

  describe('delegation', () => {
    it('create forwards dto and user id', async () => {
      service.create.mockResolvedValue(foodDto);
      const dto = { name: 'New product' };
      const result = await controller.create(dto as any, 'user-1');
      expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toEqual(foodDto);
    });

    it('findAll forwards query', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      service.findAll.mockResolvedValue(paginated as any);
      const query = { page: 2 } as any;
      const result = await controller.findAll(query);
      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginated);
    });

    it('searchOpenFoodFacts forwards search dto', async () => {
      const search = { q: 'apple' } as any;
      const offResult = { products: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 };
      service.searchOpenFoodFacts.mockResolvedValue(offResult as any);
      const result = await controller.searchOpenFoodFacts(search);
      expect(service.searchOpenFoodFacts).toHaveBeenCalledWith(search);
      expect(result).toEqual(offResult);
    });

    it('importFromOpenFoodFacts forwards barcode and user id', async () => {
      service.importFromOpenFoodFacts.mockResolvedValue(foodDto);
      const result = await controller.importFromOpenFoodFacts(
        TEST_FOOD.barcode!,
        'user-1',
      );
      expect(service.importFromOpenFoodFacts).toHaveBeenCalledWith(
        TEST_FOOD.barcode,
        'user-1',
      );
      expect(result).toEqual(foodDto);
    });

    it('update forwards id and dto', async () => {
      service.update.mockResolvedValue(foodDto);
      const dto = { name: 'Updated' };
      const result = await controller.update(TEST_FOOD.id, dto as any);
      expect(service.update).toHaveBeenCalledWith(TEST_FOOD.id, dto);
      expect(result).toEqual(foodDto);
    });

    it('remove forwards id', async () => {
      service.remove.mockResolvedValue(undefined);
      await controller.remove(TEST_FOOD.id);
      expect(service.remove).toHaveBeenCalledWith(TEST_FOOD.id);
    });
  });

  describe('getOpenFoodFactsInfo', () => {
    it('returns null without calling OFF when product has no barcode', async () => {
      service.findOne.mockResolvedValue({ ...foodDto, barcode: null } as any);
      const result = await controller.getOpenFoodFactsInfo(TEST_FOOD.id);
      expect(service.findOne).toHaveBeenCalledWith(TEST_FOOD.id);
      expect(service.getOpenFoodFactsInfo).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('delegates to getOpenFoodFactsInfo when barcode is set', async () => {
      const offPayload = { product_name: 'Apple' };
      service.findOne.mockResolvedValue(foodDto);
      service.getOpenFoodFactsInfo.mockResolvedValue(offPayload as any);
      const result = await controller.getOpenFoodFactsInfo(TEST_FOOD.id);
      expect(service.findOne).toHaveBeenCalledWith(TEST_FOOD.id);
      expect(service.getOpenFoodFactsInfo).toHaveBeenCalledWith(TEST_FOOD.barcode);
      expect(result).toEqual(offPayload);
    });
  });
});
