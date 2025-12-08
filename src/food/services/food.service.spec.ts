import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FoodService } from './food.service';
import { FoodRepository } from '../repositories/food.repository';
import { OpenFoodFactsService } from './openfoodfacts.service';
import { CreateFoodDto } from '../dto/create-food.dto';
import { UpdateFoodDto } from '../dto/update-food.dto';
import { FoodQueryDto } from '../dto/food-query.dto';

describe('FoodService', () => {
  let service: FoodService;
  let foodRepository: jest.Mocked<FoodRepository>;
  let openFoodFactsService: jest.Mocked<OpenFoodFactsService>;

  const mockFood = {
    id: 'food-1',
    name: 'Test Food',
    description: 'Test Description',
    barcode: '1234567890',
    openFoodFactsId: 'off-123',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOpenFoodFactsProduct = {
    id: 'off-product-1',
    barcode: '1234567890',
    name: 'OpenFoodFacts Product',
    genericName: 'Generic Name',
    brands: ['Brand1', 'Brand2'],
    categories: ['category1', 'category2'],
    ingredients: 'ingredient1, ingredient2',
    allergens: ['allergen1'],
    nutritionGrade: 'a',
    novaGroup: 1,
    nutritionalInfo: {
      energyKcal: 100,
      fat: 5,
      carbohydrates: 10,
      proteins: 3,
    },
    imageUrl: 'https://example.com/image.jpg',
    completeness: 85,
  };

  const mockFoodRepositoryMethods = {
    create: jest.fn(),
    findById: jest.fn(),
    findByBarcode: jest.fn(),
    findByOpenFoodFactsId: jest.fn(),
    findWithPagination: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const mockOpenFoodFactsServiceMethods = {
    getProductByBarcode: jest.fn(),
    searchProducts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodService,
        {
          provide: FoodRepository,
          useValue: mockFoodRepositoryMethods,
        },
        {
          provide: OpenFoodFactsService,
          useValue: mockOpenFoodFactsServiceMethods,
        },
      ],
    }).compile();

    service = module.get<FoodService>(FoodService);
    foodRepository = module.get(FoodRepository);
    openFoodFactsService = module.get(OpenFoodFactsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createFoodDto: CreateFoodDto = {
      name: 'New Food',
      description: 'New Description',
      barcode: '9876543210',
    };
    const userId = 'user-1';

    it('should create a new food successfully', async () => {
      foodRepository.findByBarcode.mockResolvedValueOnce(null);
      foodRepository.create.mockResolvedValueOnce(mockFood);

      const result = await service.create(createFoodDto, userId);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockFood.name);
      expect(foodRepository.findByBarcode).toHaveBeenCalledWith(
        createFoodDto.barcode,
      );
      expect(foodRepository.create).toHaveBeenCalledWith({
        ...createFoodDto,
        createdBy: userId,
      });
    });

    it('should throw BadRequestException if barcode already exists', async () => {
      foodRepository.findByBarcode.mockResolvedValueOnce(mockFood);

      await expect(service.create(createFoodDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if OpenFoodFacts ID already exists', async () => {
      const createDtoWithOffId = {
        ...createFoodDto,
        openFoodFactsId: 'off-123',
      };
      foodRepository.findByBarcode.mockResolvedValueOnce(null);
      foodRepository.findByOpenFoodFactsId.mockResolvedValueOnce(mockFood);

      await expect(service.create(createDtoWithOffId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    const query: FoodQueryDto = {
      page: 1,
      limit: 10,
      search: 'test',
      sortBy: 'name',
      sortOrder: 'asc',
    };

    it('should return paginated foods', async () => {
      const mockPaginatedResult = {
        data: [mockFood],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      foodRepository.findWithPagination.mockResolvedValueOnce(
        mockPaginatedResult,
      );

      const result = await service.findAll(query);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(foodRepository.findWithPagination).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {
          name: {
            contains: 'test',
            mode: 'insensitive',
          },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should include OpenFoodFacts data when requested', async () => {
      const queryWithOff = { ...query, includeOpenFoodFacts: true };
      const mockPaginatedResult = {
        data: [mockFood],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      foodRepository.findWithPagination.mockResolvedValueOnce(
        mockPaginatedResult,
      );
      openFoodFactsService.getProductByBarcode.mockResolvedValueOnce(
        mockOpenFoodFactsProduct,
      );

      const result = await service.findAll(queryWithOff);

      expect(result.data[0].openFoodFactsInfo).toBeDefined();
      expect(openFoodFactsService.getProductByBarcode).toHaveBeenCalledWith(
        mockFood.barcode,
      );
    });

    it('should use default page and limit when not provided', async () => {
      const queryWithoutPagination: FoodQueryDto = {};
      const mockPaginatedResult = {
        data: [mockFood],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      foodRepository.findWithPagination.mockResolvedValueOnce(
        mockPaginatedResult,
      );

      const result = await service.findAll(queryWithoutPagination);

      expect(result).toBeDefined();
      expect(foodRepository.findWithPagination).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it.each([
      [1, 10, 0],
      [2, 10, 10],
      [3, 10, 20],
      [1, 5, 0],
      [2, 5, 5],
      [3, 5, 10],
      [5, 20, 80],
    ])(
      'should calculate skip correctly for page %i with limit %i (expected skip: %i)',
      async (page, limit, expectedSkip) => {
        const query: FoodQueryDto = { page, limit };
        const mockPaginatedResult = {
          data: [mockFood],
          total: 100,
          page,
          limit,
          totalPages: Math.ceil(100 / limit),
        };

        foodRepository.findWithPagination.mockResolvedValueOnce(
          mockPaginatedResult,
        );

        await service.findAll(query);

        expect(foodRepository.findWithPagination).toHaveBeenCalledWith({
          skip: expectedSkip,
          take: limit,
          where: {},
          orderBy: { createdAt: 'desc' },
        });
      },
    );

    it('should handle pagination with large total count', async () => {
      const query: FoodQueryDto = { page: 5, limit: 20 };
      const total = 250;
      const mockPaginatedResult = {
        data: [mockFood],
        total,
        page: 5,
        limit: 20,
        totalPages: Math.ceil(total / 20),
      };

      foodRepository.findWithPagination.mockResolvedValueOnce(
        mockPaginatedResult,
      );

      const result = await service.findAll(query);

      expect(result.total).toBe(250);
      expect(result.page).toBe(5);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(13);
      expect(foodRepository.findWithPagination).toHaveBeenCalledWith({
        skip: 80,
        take: 20,
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle last page with partial results', async () => {
      const query: FoodQueryDto = { page: 3, limit: 10 };
      const total = 25;
      const mockPaginatedResult = {
        data: [mockFood],
        total,
        page: 3,
        limit: 10,
        totalPages: 3,
      };

      foodRepository.findWithPagination.mockResolvedValueOnce(
        mockPaginatedResult,
      );

      const result = await service.findAll(query);

      expect(result.total).toBe(25);
      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(3);
      expect(foodRepository.findWithPagination).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a food by id', async () => {
      foodRepository.findById.mockResolvedValueOnce(mockFood);

      const result = await service.findOne('food-1');

      expect(result).toBeDefined();
      expect(result.id).toBe(mockFood.id);
      expect(foodRepository.findById).toHaveBeenCalledWith('food-1');
    });

    it('should throw NotFoundException if food not found', async () => {
      foodRepository.findById.mockResolvedValueOnce(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include OpenFoodFacts data when requested', async () => {
      foodRepository.findById.mockResolvedValueOnce(mockFood);
      openFoodFactsService.getProductByBarcode.mockResolvedValueOnce(
        mockOpenFoodFactsProduct,
      );

      const result = await service.findOne('food-1', true);

      expect(result.openFoodFactsInfo).toBeDefined();
      expect(openFoodFactsService.getProductByBarcode).toHaveBeenCalledWith(
        mockFood.barcode,
      );
    });

    it('should not include OpenFoodFacts data when includeOpenFoodFacts is false', async () => {
      foodRepository.findById.mockResolvedValueOnce(mockFood);

      const result = await service.findOne('food-1', false);

      expect(result.openFoodFactsInfo).toBeUndefined();
      expect(openFoodFactsService.getProductByBarcode).not.toHaveBeenCalled();
    });

    it('should not include OpenFoodFacts data when includeOpenFoodFacts is not provided', async () => {
      foodRepository.findById.mockResolvedValueOnce(mockFood);

      const result = await service.findOne('food-1');

      expect(result.openFoodFactsInfo).toBeUndefined();
      expect(openFoodFactsService.getProductByBarcode).not.toHaveBeenCalled();
    });

    it('should not include OpenFoodFacts data when food has no barcode', async () => {
      const foodWithoutBarcode = { ...mockFood, barcode: null };
      foodRepository.findById.mockResolvedValueOnce(foodWithoutBarcode);

      const result = await service.findOne('food-1', true);

      expect(result.openFoodFactsInfo).toBeUndefined();
      expect(openFoodFactsService.getProductByBarcode).not.toHaveBeenCalled();
    });
  });

  describe('findByBarcode', () => {
    it('should return a food by barcode', async () => {
      foodRepository.findByBarcode.mockResolvedValueOnce(mockFood);

      const result = await service.findByBarcode('1234567890');

      expect(result).toBeDefined();
      expect(result.barcode).toBe(mockFood.barcode);
      expect(foodRepository.findByBarcode).toHaveBeenCalledWith('1234567890');
    });

    it('should throw NotFoundException if food not found', async () => {
      foodRepository.findByBarcode.mockResolvedValueOnce(null);

      await expect(service.findByBarcode('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateFoodDto: UpdateFoodDto = {
      name: 'Updated Food',
      description: 'Updated Description',
    };

    it('should update a food successfully', async () => {
      const updatedFood = { ...mockFood, ...updateFoodDto };
      foodRepository.findById.mockResolvedValueOnce(mockFood);
      foodRepository.update.mockResolvedValueOnce(updatedFood);

      const result = await service.update('food-1', updateFoodDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateFoodDto.name);
      expect(foodRepository.update).toHaveBeenCalledWith(
        'food-1',
        updateFoodDto,
      );
    });

    it('should throw NotFoundException if food not found', async () => {
      foodRepository.findById.mockResolvedValueOnce(null);

      await expect(
        service.update('nonexistent', updateFoodDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a food successfully', async () => {
      foodRepository.findById.mockResolvedValueOnce(mockFood);
      foodRepository.delete.mockResolvedValueOnce(undefined);

      await service.remove('food-1');

      expect(foodRepository.delete).toHaveBeenCalledWith('food-1');
    });

    it('should throw NotFoundException if food not found', async () => {
      foodRepository.findById.mockResolvedValueOnce(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('importFromOpenFoodFacts', () => {
    it('should import food from OpenFoodFacts successfully', async () => {
      foodRepository.findByBarcode.mockResolvedValueOnce(null);
      openFoodFactsService.getProductByBarcode
        .mockResolvedValueOnce(mockOpenFoodFactsProduct) // First call for import
        .mockResolvedValueOnce(mockOpenFoodFactsProduct); // Second call for getting info
      foodRepository.create.mockResolvedValueOnce(mockFood);

      const result = await service.importFromOpenFoodFacts(
        '1234567890',
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.openFoodFactsInfo).toBeDefined();
      expect(openFoodFactsService.getProductByBarcode).toHaveBeenCalledWith(
        '1234567890',
      );
      expect(foodRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if food already exists', async () => {
      foodRepository.findByBarcode.mockResolvedValueOnce(mockFood);

      await expect(
        service.importFromOpenFoodFacts('1234567890', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if product not found in OpenFoodFacts', async () => {
      foodRepository.findByBarcode.mockResolvedValueOnce(null);
      openFoodFactsService.getProductByBarcode.mockResolvedValueOnce(null);

      await expect(
        service.importFromOpenFoodFacts('1234567890', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchOpenFoodFacts', () => {
    it('should search OpenFoodFacts products with limit', async () => {
      const searchDto = { query: 'nutella', limit: 10 };
      const mockSearchResult = {
        products: [mockOpenFoodFactsProduct],
        totalCount: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      openFoodFactsService.searchProducts.mockResolvedValueOnce(
        mockSearchResult,
      );

      const result = await service.searchOpenFoodFacts(searchDto);

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(1);
      expect(openFoodFactsService.searchProducts).toHaveBeenCalledWith({
        query: 'nutella',
        categories: undefined,
        brands: undefined,
        page: 1,
        pageSize: 10,
      });
    });

    it('should search OpenFoodFacts products with page and pageSize', async () => {
      const searchDto = { query: 'apple', page: 1, pageSize: 20 };
      const mockSearchResult = {
        products: [mockOpenFoodFactsProduct],
        totalCount: 50,
        page: 1,
        pageSize: 20,
        totalPages: 3,
      };

      openFoodFactsService.searchProducts.mockResolvedValueOnce(
        mockSearchResult,
      );

      const result = await service.searchOpenFoodFacts(searchDto);

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(1);
      expect(openFoodFactsService.searchProducts).toHaveBeenCalledWith({
        query: 'apple',
        categories: undefined,
        brands: undefined,
        page: 1,
        pageSize: 20,
      });
    });

    it('should use default page and pageSize when not provided', async () => {
      const searchDto = { query: 'nutella' };
      const mockSearchResult = {
        products: [mockOpenFoodFactsProduct],
        totalCount: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      openFoodFactsService.searchProducts.mockResolvedValueOnce(
        mockSearchResult,
      );

      const result = await service.searchOpenFoodFacts(searchDto);

      expect(result).toBeDefined();
      expect(openFoodFactsService.searchProducts).toHaveBeenCalledWith({
        query: 'nutella',
        categories: undefined,
        brands: undefined,
        page: 1,
        pageSize: 10,
      });
    });

    it('should prioritize pageSize over limit when both are provided', async () => {
      const searchDto = { query: 'nutella', limit: 5, pageSize: 20 };
      const mockSearchResult = {
        products: [mockOpenFoodFactsProduct],
        totalCount: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };

      openFoodFactsService.searchProducts.mockResolvedValueOnce(
        mockSearchResult,
      );

      const result = await service.searchOpenFoodFacts(searchDto);

      expect(result).toBeDefined();
      expect(openFoodFactsService.searchProducts).toHaveBeenCalledWith({
        query: 'nutella',
        categories: undefined,
        brands: undefined,
        page: 1,
        pageSize: 20,
      });
    });
  });

  describe('getOpenFoodFactsInfo', () => {
    it('should return OpenFoodFacts info for valid barcode', async () => {
      openFoodFactsService.getProductByBarcode.mockResolvedValueOnce(
        mockOpenFoodFactsProduct,
      );

      const result = await service.getOpenFoodFactsInfo('1234567890');

      expect(result).toBeDefined();
      expect(result?.barcode).toBe(mockOpenFoodFactsProduct.barcode);
      expect(openFoodFactsService.getProductByBarcode).toHaveBeenCalledWith(
        '1234567890',
      );
    });

    it('should return null if product not found', async () => {
      openFoodFactsService.getProductByBarcode.mockResolvedValueOnce(null);

      const result = await service.getOpenFoodFactsInfo('1234567890');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      openFoodFactsService.getProductByBarcode.mockRejectedValueOnce(
        new Error('API Error'),
      );

      const result = await service.getOpenFoodFactsInfo('1234567890');

      expect(result).toBeNull();
    });
  });
});
