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
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByBarcode: jest.fn(),
      searchOpenFoodFacts: jest.fn(),
      importFromOpenFoodFacts: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getOpenFoodFactsInfo: jest.fn(),
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

  describe('create', () => {
    it('should call service with dto and userId and return result', async () => {
      const createDto = { name: 'Apple', barcode: '123' } as any;
      const userId = 'user-1';
      foodService.create.mockResolvedValueOnce(mockFoodResponse as any);

      const result = await controller.create(createDto, userId);

      expect(result).toEqual(mockFoodResponse);
      expect(foodService.create).toHaveBeenCalledWith(createDto, userId);
    });
  });

  describe('findAll', () => {
    it('should call service with query and return result', async () => {
      const query = { page: 1, limit: 10 } as any;
      const mockPaginated = { data: [mockFoodResponse], total: 1 };
      foodService.findAll.mockResolvedValueOnce(mockPaginated as any);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockPaginated);
      expect(foodService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findByBarcode', () => {
    it('should call service with includeOpenFoodFacts=true when query param is "true"', async () => {
      foodService.findByBarcode.mockResolvedValueOnce(
        mockFoodResponseWithOff as any,
      );

      const result = await controller.findByBarcode('123', 'true');

      expect(result).toEqual(mockFoodResponseWithOff);
      expect(foodService.findByBarcode).toHaveBeenCalledWith('123', true);
    });

    it('should call service with includeOpenFoodFacts=false when query param is undefined', async () => {
      foodService.findByBarcode.mockResolvedValueOnce(mockFoodResponse as any);

      const result = await controller.findByBarcode('123', undefined);

      expect(result).toEqual(mockFoodResponse);
      expect(foodService.findByBarcode).toHaveBeenCalledWith('123', false);
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

  describe('importFromOpenFoodFacts', () => {
    it('should call service with barcode and userId and return result', async () => {
      foodService.importFromOpenFoodFacts.mockResolvedValueOnce(
        mockFoodResponse as any,
      );

      const result = await controller.importFromOpenFoodFacts('123', 'user-1');

      expect(result).toEqual(mockFoodResponse);
      expect(foodService.importFromOpenFoodFacts).toHaveBeenCalledWith(
        '123',
        'user-1',
      );
    });
  });

  describe('update', () => {
    it('should call service with id and dto and return result', async () => {
      const updateDto = { name: 'Updated' } as any;
      foodService.update.mockResolvedValueOnce({
        ...mockFoodResponse,
        name: 'Updated',
      } as any);

      const result = await controller.update('food-1', updateDto);

      expect(result.name).toBe('Updated');
      expect(foodService.update).toHaveBeenCalledWith('food-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should call service with id', async () => {
      foodService.remove.mockResolvedValueOnce(undefined);

      await controller.remove('food-1');

      expect(foodService.remove).toHaveBeenCalledWith('food-1');
    });
  });

  describe('getOpenFoodFactsInfo', () => {
    it('should return null when food has no barcode and not call getOpenFoodFactsInfo', async () => {
      foodService.findOne.mockResolvedValueOnce({
        ...mockFoodResponse,
        barcode: null,
      } as any);

      const result = await controller.getOpenFoodFactsInfo('food-1');

      expect(result).toBeNull();
      expect(foodService.getOpenFoodFactsInfo).not.toHaveBeenCalled();
    });

    it('should call getOpenFoodFactsInfo when barcode exists', async () => {
      foodService.findOne.mockResolvedValueOnce(mockFoodResponse as any);
      foodService.getOpenFoodFactsInfo.mockResolvedValueOnce(
        mockFoodResponseWithOff.openFoodFactsInfo as any,
      );

      const result = await controller.getOpenFoodFactsInfo('food-1');

      expect(result).toEqual(mockFoodResponseWithOff.openFoodFactsInfo);
      expect(foodService.getOpenFoodFactsInfo).toHaveBeenCalledWith(
        mockFoodResponse.barcode,
      );
    });
  });
});
