import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FoodService } from './food.service';
import { FoodRepository } from '../repositories/food.repository';
import { FoodCategoryRepository } from '../repositories/food-category.repository';
import { OpenFoodFactsService } from './openfoodfacts.service';
import { CreateFoodDto } from '../dto/create-food.dto';
import { UpdateFoodDto } from '../dto/update-food.dto';
import { FoodQueryDto } from '../dto/food-query.dto';

describe('FoodService', () => {
  let service: FoodService;
  let mockFoodRepository: jest.Mocked<FoodRepository>;
  let mockCategoryRepository: jest.Mocked<FoodCategoryRepository>;
  let mockOpenFoodFactsService: jest.Mocked<OpenFoodFactsService>;

  const mockFood = {
    id: 'food-1',
    name: 'Test Food',
    description: 'Test Description',
    barcode: '1234567890',
    openFoodFactsId: 'off-123',
    categoryId: 'category-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    category: {
      id: 'category-1',
      name: 'Test Category',
      description: 'Test Category Description',
    },
  };

  const mockCategory = {
    id: 'category-1',
    name: 'Test Category',
    description: 'Test Category Description',
    createdAt: new Date(),
  };

  const mockOpenFoodFactsProduct = {
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

  const mockFoodRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByBarcode: jest.fn(),
    findByOpenFoodFactsId: jest.fn(),
    findWithPagination: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const mockCategoryRepository = {
    findById: jest.fn(),
  };

  const mockOpenFoodFactsService = {
    getProductByBarcode: jest.fn(),
    searchProducts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodService,
        {
          provide: FoodRepository,
          useValue: mockFoodRepository,
        },
        {
          provide: FoodCategoryRepository,
          useValue: mockCategoryRepository,
        },
        {
          provide: OpenFoodFactsService,
          useValue: mockOpenFoodFactsService,
        },
      ],
    }).compile();

    service = module.get<FoodService>(FoodService);
    mockFoodRepository = module.get(FoodRepository);
    mockCategoryRepository = module.get(FoodCategoryRepository);
    mockOpenFoodFactsService = module.get(OpenFoodFactsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createFoodDto: CreateFoodDto = {
      name: 'New Food',
      description: 'New Description',
      barcode: '9876543210',
      categoryId: 'category-1',
      createdBy: 'user-1',
    };

    it('should create a new food successfully', async () => {
      mockCategoryRepository.findById.mockResolvedValueOnce(mockCategory);
      mockFoodRepository.findByBarcode.mockResolvedValueOnce(null);
      mockFoodRepository.create.mockResolvedValueOnce(mockFood);

      const result = await service.create(createFoodDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockFood.name);
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(
        createFoodDto.categoryId,
      );
      expect(mockFoodRepository.findByBarcode).toHaveBeenCalledWith(
        createFoodDto.barcode,
      );
      expect(mockFoodRepository.create).toHaveBeenCalledWith(createFoodDto);
    });

    it('should throw BadRequestException if category not found', async () => {
      mockCategoryRepository.findById.mockResolvedValueOnce(null);

      await expect(service.create(createFoodDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(
        createFoodDto.categoryId,
      );
    });

    it('should throw BadRequestException if barcode already exists', async () => {
      mockCategoryRepository.findById.mockResolvedValueOnce(mockCategory);
      mockFoodRepository.findByBarcode.mockResolvedValueOnce(mockFood);

      await expect(service.create(createFoodDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if OpenFoodFacts ID already exists', async () => {
      const createDtoWithOffId = {
        ...createFoodDto,
        openFoodFactsId: 'off-123',
      };
      mockCategoryRepository.findById.mockResolvedValueOnce(mockCategory);
      mockFoodRepository.findByBarcode.mockResolvedValueOnce(null);
      mockFoodRepository.findByOpenFoodFactsId.mockResolvedValueOnce(mockFood);

      await expect(service.create(createDtoWithOffId)).rejects.toThrow(
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

      mockFoodRepository.findWithPagination.mockResolvedValueOnce(
        mockPaginatedResult,
      );

      const result = await service.findAll(query);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockFoodRepository.findWithPagination).toHaveBeenCalledWith({
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

      mockFoodRepository.findWithPagination.mockResolvedValueOnce(
        mockPaginatedResult,
      );
      mockOpenFoodFactsService.getProductByBarcode.mockResolvedValueOnce(
        mockOpenFoodFactsProduct,
      );

      const result = await service.findAll(queryWithOff);

      expect(result.data[0].openFoodFactsInfo).toBeDefined();
      expect(mockOpenFoodFactsService.getProductByBarcode).toHaveBeenCalledWith(
        mockFood.barcode,
      );
    });
  });

  describe('findOne', () => {
    it('should return a food by id', async () => {
      mockFoodRepository.findById.mockResolvedValueOnce(mockFood);

      const result = await service.findOne('food-1');

      expect(result).toBeDefined();
      expect(result.id).toBe(mockFood.id);
      expect(mockFoodRepository.findById).toHaveBeenCalledWith('food-1');
    });

    it('should throw NotFoundException if food not found', async () => {
      mockFoodRepository.findById.mockResolvedValueOnce(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include OpenFoodFacts data when requested', async () => {
      mockFoodRepository.findById.mockResolvedValueOnce(mockFood);
      mockOpenFoodFactsService.getProductByBarcode.mockResolvedValueOnce(
        mockOpenFoodFactsProduct,
      );

      const result = await service.findOne('food-1', true);

      expect(result.openFoodFactsInfo).toBeDefined();
      expect(mockOpenFoodFactsService.getProductByBarcode).toHaveBeenCalledWith(
        mockFood.barcode,
      );
    });
  });

  describe('findByBarcode', () => {
    it('should return a food by barcode', async () => {
      mockFoodRepository.findByBarcode.mockResolvedValueOnce(mockFood);

      const result = await service.findByBarcode('1234567890');

      expect(result).toBeDefined();
      expect(result.barcode).toBe(mockFood.barcode);
      expect(mockFoodRepository.findByBarcode).toHaveBeenCalledWith(
        '1234567890',
      );
    });

    it('should throw NotFoundException if food not found', async () => {
      mockFoodRepository.findByBarcode.mockResolvedValueOnce(null);

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
      mockFoodRepository.findById.mockResolvedValueOnce(mockFood);
      mockFoodRepository.update.mockResolvedValueOnce(updatedFood);

      const result = await service.update('food-1', updateFoodDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateFoodDto.name);
      expect(mockFoodRepository.update).toHaveBeenCalledWith(
        'food-1',
        updateFoodDto,
      );
    });

    it('should throw NotFoundException if food not found', async () => {
      mockFoodRepository.findById.mockResolvedValueOnce(null);

      await expect(
        service.update('nonexistent', updateFoodDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate category if provided', async () => {
      const updateWithCategory = {
        ...updateFoodDto,
        categoryId: 'new-category',
      };
      mockFoodRepository.findById.mockResolvedValueOnce(mockFood);
      mockCategoryRepository.findById.mockResolvedValueOnce(null);

      await expect(
        service.update('food-1', updateWithCategory),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove a food successfully', async () => {
      mockFoodRepository.findById.mockResolvedValueOnce(mockFood);
      mockFoodRepository.delete.mockResolvedValueOnce(undefined);

      await service.remove('food-1');

      expect(mockFoodRepository.delete).toHaveBeenCalledWith('food-1');
    });

    it('should throw NotFoundException if food not found', async () => {
      mockFoodRepository.findById.mockResolvedValueOnce(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('importFromOpenFoodFacts', () => {
    it('should import food from OpenFoodFacts successfully', async () => {
      mockFoodRepository.findByBarcode.mockResolvedValueOnce(null);
      mockOpenFoodFactsService.getProductByBarcode
        .mockResolvedValueOnce(mockOpenFoodFactsProduct) // First call for import
        .mockResolvedValueOnce(mockOpenFoodFactsProduct); // Second call for getting info
      mockCategoryRepository.findById.mockResolvedValueOnce(mockCategory);
      mockFoodRepository.create.mockResolvedValueOnce(mockFood);

      const result = await service.importFromOpenFoodFacts(
        '1234567890',
        'category-1',
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.openFoodFactsInfo).toBeDefined();
      expect(mockOpenFoodFactsService.getProductByBarcode).toHaveBeenCalledWith(
        '1234567890',
      );
      expect(mockFoodRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if food already exists', async () => {
      mockFoodRepository.findByBarcode.mockResolvedValueOnce(mockFood);

      await expect(
        service.importFromOpenFoodFacts('1234567890', 'category-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if product not found in OpenFoodFacts', async () => {
      mockFoodRepository.findByBarcode.mockResolvedValueOnce(null);
      mockOpenFoodFactsService.getProductByBarcode.mockResolvedValueOnce(null);

      await expect(
        service.importFromOpenFoodFacts('1234567890', 'category-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchOpenFoodFacts', () => {
    it('should search OpenFoodFacts products', async () => {
      const searchDto = { query: 'nutella', limit: 10 };
      const mockSearchResult = {
        products: [mockOpenFoodFactsProduct],
        totalCount: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      mockOpenFoodFactsService.searchProducts.mockResolvedValueOnce(
        mockSearchResult,
      );

      const result = await service.searchOpenFoodFacts(searchDto);

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(1);
      expect(mockOpenFoodFactsService.searchProducts).toHaveBeenCalledWith({
        query: 'nutella',
        categories: undefined,
        brands: undefined,
        pageSize: 10,
      });
    });
  });

  describe('getOpenFoodFactsInfo', () => {
    it('should return OpenFoodFacts info for valid barcode', async () => {
      mockOpenFoodFactsService.getProductByBarcode.mockResolvedValueOnce(
        mockOpenFoodFactsProduct,
      );

      const result = await service.getOpenFoodFactsInfo('1234567890');

      expect(result).toBeDefined();
      expect(result?.barcode).toBe(mockOpenFoodFactsProduct.barcode);
      expect(mockOpenFoodFactsService.getProductByBarcode).toHaveBeenCalledWith(
        '1234567890',
      );
    });

    it('should return null if product not found', async () => {
      mockOpenFoodFactsService.getProductByBarcode.mockResolvedValueOnce(null);

      const result = await service.getOpenFoodFactsInfo('1234567890');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockOpenFoodFactsService.getProductByBarcode.mockRejectedValueOnce(
        new Error('API Error'),
      );

      const result = await service.getOpenFoodFactsInfo('1234567890');

      expect(result).toBeNull();
    });
  });
});
