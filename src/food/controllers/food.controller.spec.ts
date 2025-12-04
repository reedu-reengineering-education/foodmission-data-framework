import { Test, TestingModule } from '@nestjs/testing';
import { FoodController } from './food.controller';
import { FoodService } from '../services/food.service';
import { NotFoundException } from '@nestjs/common';
import { UserContextService } from '../../auth/user-context.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CacheInterceptor } from '../../cache/cache.interceptor';
import { CacheEvictInterceptor } from '../../cache/cache-evict.interceptor';

describe('FoodController', () => {
  let controller: FoodController;
  let foodService: jest.Mocked<FoodService>;

  const mockFoodResponse = {
    id: 'food-1',
    name: 'Test Food',
    description: 'Test Description',
    barcode: '1234567890',
    openFoodFactsId: 'off-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
  };

  const mockFoodResponseWithOff = {
    ...mockFoodResponse,
    openFoodFactsInfo: {
      id: 'off-123',
      barcode: '1234567890',
      name: 'OpenFoodFacts Product',
    },
  };

  beforeEach(async () => {
    const mockFoodService = {
      findOne: jest.fn(),
      searchOpenFoodFacts: jest.fn(),
    };

    const mockUserContextService = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodController],
      providers: [
        {
          provide: FoodService,
          useValue: mockFoodService,
        },
        {
          provide: UserContextService,
          useValue: mockUserContextService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(CacheInterceptor)
      .useValue({ intercept: (context, next) => next.handle() })
      .overrideInterceptor(CacheEvictInterceptor)
      .useValue({ intercept: (context, next) => next.handle() })
      .compile();

    controller = module.get<FoodController>(FoodController);
    foodService = module.get(FoodService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should call service with correct parameters and return result', async () => {
      foodService.findOne.mockResolvedValueOnce(mockFoodResponse);

      const result = await controller.findOne('food-1', undefined);

      expect(result).toEqual(mockFoodResponse);
      expect(foodService.findOne).toHaveBeenCalledWith('food-1', false);
    });

    it('should call service with includeOpenFoodFacts=true when query param is "true"', async () => {
      foodService.findOne.mockResolvedValueOnce(mockFoodResponseWithOff);

      const result = await controller.findOne('food-1', 'true');

      expect(result).toEqual(mockFoodResponseWithOff);
      expect(foodService.findOne).toHaveBeenCalledWith('food-1', true);
    });

    it('should call service with includeOpenFoodFacts=false when query param is "false"', async () => {
      foodService.findOne.mockResolvedValueOnce(mockFoodResponse);

      const result = await controller.findOne('food-1', 'false');

      expect(result).toEqual(mockFoodResponse);
      expect(foodService.findOne).toHaveBeenCalledWith('food-1', false);
    });

    it('should call service with includeOpenFoodFacts=false when query param is undefined', async () => {
      foodService.findOne.mockResolvedValueOnce(mockFoodResponse);

      const result = await controller.findOne('food-1', undefined);

      expect(result).toEqual(mockFoodResponse);
      expect(foodService.findOne).toHaveBeenCalledWith('food-1', false);
    });

    it('should call service with includeOpenFoodFacts=false when query param is empty string', async () => {
      foodService.findOne.mockResolvedValueOnce(mockFoodResponse);

      const result = await controller.findOne('food-1', '');

      expect(result).toEqual(mockFoodResponse);
      expect(foodService.findOne).toHaveBeenCalledWith('food-1', false);
    });

    it('should propagate NotFoundException from service', async () => {
      foodService.findOne.mockRejectedValueOnce(
        new NotFoundException('Food not found'),
      );

      await expect(
        controller.findOne('non-existent', undefined),
      ).rejects.toThrow(NotFoundException);
      expect(foodService.findOne).toHaveBeenCalledWith('non-existent', false);
    });
  });

  describe('searchOpenFoodFacts', () => {
    const mockSearchResult = {
      products: [
        {
          id: 'off-123',
          barcode: '1234567890',
          name: 'Test Product',
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };

    it('should call service with correct parameters and return result', async () => {
      const searchDto = { query: 'apple', page: 1, pageSize: 20 };
      foodService.searchOpenFoodFacts.mockResolvedValueOnce(mockSearchResult);

      const result = await controller.searchOpenFoodFacts(searchDto);

      expect(result).toEqual(mockSearchResult);
      expect(foodService.searchOpenFoodFacts).toHaveBeenCalledWith(searchDto);
    });

    it('should call service with query only', async () => {
      const searchDto = { query: 'apple' };
      foodService.searchOpenFoodFacts.mockResolvedValueOnce(mockSearchResult);

      const result = await controller.searchOpenFoodFacts(searchDto);

      expect(result).toEqual(mockSearchResult);
      expect(foodService.searchOpenFoodFacts).toHaveBeenCalledWith(searchDto);
    });

    it('should call service with all optional parameters', async () => {
      const searchDto = {
        query: 'apple',
        category: 'fruits',
        brand: 'test brand',
        page: 2,
        pageSize: 30,
      };
      foodService.searchOpenFoodFacts.mockResolvedValueOnce(mockSearchResult);

      const result = await controller.searchOpenFoodFacts(searchDto);

      expect(result).toEqual(mockSearchResult);
      expect(foodService.searchOpenFoodFacts).toHaveBeenCalledWith(searchDto);
    });

    it('should propagate errors from service', async () => {
      const searchDto = { query: 'apple' };
      const error = new Error('Service error');
      foodService.searchOpenFoodFacts.mockRejectedValueOnce(error);

      await expect(controller.searchOpenFoodFacts(searchDto)).rejects.toThrow(
        error,
      );
      expect(foodService.searchOpenFoodFacts).toHaveBeenCalledWith(searchDto);
    });
  });
});
