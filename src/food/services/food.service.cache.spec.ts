import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FoodService } from './food.service';
import { FoodRepository } from '../repositories/food.repository';
import { OpenFoodFactsService } from './openfoodfacts.service';
import { CacheInterceptor } from '../../cache/cache.interceptor';
import { CacheEvictInterceptor } from '../../cache/cache-evict.interceptor';
import { LoggingService } from '../../common/logging/logging.service';
import { Reflector } from '@nestjs/core';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('FoodService - Caching Integration', () => {
  let service: FoodService;
  let foodRepository: jest.Mocked<FoodRepository>;
  let openFoodFactsService: jest.Mocked<OpenFoodFactsService>;
  let cacheManager: jest.Mocked<any>;

  const mockFood = {
    id: '123',
    name: 'Test Food',
    description: 'Test Description',
    barcode: '1234567890',
    openFoodFactsId: 'off123',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user123',
  };

  beforeEach(async () => {
    const mockFoodRepository = {
      findById: jest.fn(),
      findByBarcode: jest.fn(),
      findByOpenFoodFactsId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findWithPagination: jest.fn(),
    };

    const mockOpenFoodFactsService = {
      getProductByBarcode: jest.fn(),
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockLoggingService = {
      debug: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodService,
        {
          provide: FoodRepository,
          useValue: mockFoodRepository,
        },
        {
          provide: OpenFoodFactsService,
          useValue: mockOpenFoodFactsService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        CacheInterceptor,
        CacheEvictInterceptor,
      ],
    }).compile();

    service = module.get<FoodService>(FoodService);
    foodRepository = module.get(FoodRepository);
    openFoodFactsService = module.get(OpenFoodFactsService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('findOne with @Cacheable', () => {
    it('should call repository when cache miss occurs', async () => {
      foodRepository.findById.mockResolvedValue(mockFood);

      const result = await service.findOne('123');

      expect(foodRepository.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual({
        id: mockFood.id,
        name: mockFood.name,
        description: mockFood.description,
        barcode: mockFood.barcode,
        openFoodFactsId: mockFood.openFoodFactsId,
        createdAt: mockFood.createdAt,
        updatedAt: mockFood.updatedAt,
        createdBy: mockFood.createdBy,
      });
    });

    it('should throw NotFoundException when food not found', async () => {
      foodRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('123')).rejects.toThrow(NotFoundException);
      expect(foodRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should include OpenFoodFacts data when requested', async () => {
      const mockProductInfo = {
        id: 'off123',
        barcode: '1234567890',
        name: 'Test Product',
        brands: ['Test Brand'],
        categories: ['test-category'],
        ingredients: 'Test ingredients',
        allergens: ['gluten'],
        nutritionGrade: 'a',
        novaGroup: 1,
        nutritionalInfo: { energyKcal: 100 },
        imageUrl: 'http://test.com/image.jpg',
        completeness: 0.8,
      };

      foodRepository.findById.mockResolvedValue(mockFood);
      openFoodFactsService.getProductByBarcode.mockResolvedValue(
        mockProductInfo,
      );

      const result = await service.findOne('123', true);

      expect(openFoodFactsService.getProductByBarcode).toHaveBeenCalledWith(
        '1234567890',
      );
      expect(result.openFoodFactsInfo).toBeDefined();
      expect(result.openFoodFactsInfo?.barcode).toBe('1234567890');
    });
  });

  describe('findByBarcode with @Cacheable', () => {
    it('should call repository when cache miss occurs', async () => {
      foodRepository.findByBarcode.mockResolvedValue(mockFood);

      const result = await service.findByBarcode('1234567890');

      expect(foodRepository.findByBarcode).toHaveBeenCalledWith('1234567890');
      expect(result.barcode).toBe('1234567890');
    });

    it('should throw NotFoundException when food not found', async () => {
      foodRepository.findByBarcode.mockResolvedValue(null);

      await expect(service.findByBarcode('1234567890')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create with @CacheEvict', () => {
    const createFoodDto = {
      name: 'New Food',
      description: 'New Description',
      barcode: '9876543210',
      createdBy: 'user123',
    };

    it('should create food successfully', async () => {
      foodRepository.findByBarcode.mockResolvedValue(null);
      foodRepository.findByOpenFoodFactsId.mockResolvedValue(null);
      foodRepository.create.mockResolvedValue({
        ...mockFood,
        ...createFoodDto,
      });

      const result = await service.create(createFoodDto);

      expect(foodRepository.create).toHaveBeenCalledWith(createFoodDto);
      expect(result.name).toBe(createFoodDto.name);
    });

    it('should throw BadRequestException when barcode already exists', async () => {
      foodRepository.findByBarcode.mockResolvedValue(mockFood);

      await expect(service.create(createFoodDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(foodRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when OpenFoodFacts ID already exists', async () => {
      const createDtoWithOffId = {
        ...createFoodDto,
        openFoodFactsId: 'existing-off-id',
      };

      foodRepository.findByBarcode.mockResolvedValue(null);
      foodRepository.findByOpenFoodFactsId.mockResolvedValue(mockFood);

      await expect(service.create(createDtoWithOffId)).rejects.toThrow(
        BadRequestException,
      );
      expect(foodRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update with @CacheEvict', () => {
    const updateFoodDto = {
      name: 'Updated Food',
      description: 'Updated Description',
    };

    it('should update food successfully', async () => {
      const updatedFood = { ...mockFood, ...updateFoodDto };

      foodRepository.findById.mockResolvedValue(mockFood);
      foodRepository.update.mockResolvedValue(updatedFood);

      const result = await service.update('123', updateFoodDto);

      expect(foodRepository.findById).toHaveBeenCalledWith('123');
      expect(foodRepository.update).toHaveBeenCalledWith('123', updateFoodDto);
      expect(result.name).toBe(updateFoodDto.name);
    });

    it('should throw NotFoundException when food not found', async () => {
      foodRepository.findById.mockResolvedValue(null);

      await expect(service.update('123', updateFoodDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(foodRepository.update).not.toHaveBeenCalled();
    });

    it('should validate barcode uniqueness when updating barcode', async () => {
      const updateWithBarcode = { ...updateFoodDto, barcode: '9999999999' };
      const existingFoodWithBarcode = {
        ...mockFood,
        id: '456',
        barcode: '9999999999',
      };

      foodRepository.findById.mockResolvedValue(mockFood);
      foodRepository.findByBarcode.mockResolvedValue(existingFoodWithBarcode);

      await expect(service.update('123', updateWithBarcode)).rejects.toThrow(
        BadRequestException,
      );
      expect(foodRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove with @CacheEvict', () => {
    it('should remove food successfully', async () => {
      foodRepository.findById.mockResolvedValue(mockFood);
      foodRepository.delete.mockResolvedValue(undefined);

      await service.remove('123');

      expect(foodRepository.findById).toHaveBeenCalledWith('123');
      expect(foodRepository.delete).toHaveBeenCalledWith('123');
    });

    it('should throw NotFoundException when food not found', async () => {
      foodRepository.findById.mockResolvedValue(null);

      await expect(service.remove('123')).rejects.toThrow(NotFoundException);
      expect(foodRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getOpenFoodFactsInfo with @Cacheable', () => {
    const mockProductInfo = {
      id: 'off123',
      barcode: '1234567890',
      name: 'Test Product',
      brands: ['Test Brand'],
      categories: ['test-category'],
      ingredients: 'Test ingredients',
      allergens: ['gluten'],
      nutritionGrade: 'a',
      novaGroup: 1,
      nutritionalInfo: { energyKcal: 100 },
      imageUrl: 'http://test.com/image.jpg',
      completeness: 0.8,
    };

    it('should fetch and transform OpenFoodFacts data', async () => {
      openFoodFactsService.getProductByBarcode.mockResolvedValue(
        mockProductInfo,
      );

      const result = await service.getOpenFoodFactsInfo('1234567890');

      expect(openFoodFactsService.getProductByBarcode).toHaveBeenCalledWith(
        '1234567890',
      );
      expect(result).toEqual({
        barcode: mockProductInfo.barcode,
        name: mockProductInfo.name,
        brands: mockProductInfo.brands,
        categories: mockProductInfo.categories,
        ingredients: mockProductInfo.ingredients,
        allergens: mockProductInfo.allergens,
        nutritionGrade: mockProductInfo.nutritionGrade,
        novaGroup: mockProductInfo.novaGroup,
        nutritionalInfo: mockProductInfo.nutritionalInfo,
        imageUrl: mockProductInfo.imageUrl,
        completeness: mockProductInfo.completeness,
      });
    });

    it('should return null when product not found', async () => {
      openFoodFactsService.getProductByBarcode.mockResolvedValue(null);

      const result = await service.getOpenFoodFactsInfo('1234567890');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      openFoodFactsService.getProductByBarcode.mockRejectedValue(
        new Error('API Error'),
      );

      const result = await service.getOpenFoodFactsInfo('1234567890');

      expect(result).toBeNull();
    });
  });
});
