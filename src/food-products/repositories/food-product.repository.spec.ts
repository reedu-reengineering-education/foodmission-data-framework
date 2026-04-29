import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  FoodProductCreateInput,
  FoodProductRepository,
} from './food-product.repository';
import { UpdateFoodProductDto } from '../dto/update-food-product.dto';
import { PrismaService } from '../../database/prisma.service';
import { TEST_FOOD } from '../../../test/fixtures/food.fixtures';
import { FOOD_PRODUCT_WITH_RELATIONS_INCLUDE } from '../../common/types/prisma-relations';

describe('FoodProductRepository', () => {
  let repository: FoodProductRepository;
  const mockFood = { ...TEST_FOOD };
  let mockPrismaService: any;
  beforeAll(() => {
    mockPrismaService = {
      foodProduct: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodProductRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();
    repository = module.get<FoodProductRepository>(FoodProductRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all food products with default options', async () => {
      mockPrismaService.foodProduct.findMany.mockResolvedValueOnce([mockFood]);

      const result = await repository.findAll();

      expect(result).toEqual([mockFood]);
      expect(mockPrismaService.foodProduct.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        where: undefined,
        orderBy: { createdAt: 'desc' },
        include: undefined,
      });
    });

    it('should return food products with custom options', async () => {
      const options: {
        skip: number;
        take: number;
        where: Prisma.FoodProductWhereInput;
        orderBy: Prisma.FoodProductOrderByWithRelationInput;
      } = {
        skip: 10,
        take: 5,
        where: { name: 'test' },
        orderBy: { name: 'asc' },
      };
      mockPrismaService.foodProduct.findMany.mockResolvedValueOnce([mockFood]);

      const result = await repository.findAll(options);

      expect(result).toEqual([mockFood]);
      expect(mockPrismaService.foodProduct.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        where: { name: 'test' },
        orderBy: { name: 'asc' },
        include: undefined,
      });
    });

    it('should throw error when database fails', async () => {
      const dbError = new Error('Database error');
      mockPrismaService.foodProduct.findMany.mockRejectedValueOnce(dbError);

      await expect(repository.findAll()).rejects.toThrow(dbError);
    });
  });

  describe('findById', () => {
    it('should return food product by id', async () => {
      mockPrismaService.foodProduct.findUnique.mockResolvedValueOnce(mockFood);

      const result = await repository.findById('food-1');

      expect(result).toEqual(mockFood);
      expect(mockPrismaService.foodProduct.findUnique).toHaveBeenCalledWith({
        where: { id: 'food-1' },
        include: FOOD_PRODUCT_WITH_RELATIONS_INCLUDE,
      });
    });

    it('should return null when food product not found', async () => {
      mockPrismaService.foodProduct.findUnique.mockResolvedValueOnce(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error when database fails', async () => {
      const dbError = new Error('Database error');
      mockPrismaService.foodProduct.findUnique.mockRejectedValueOnce(dbError);

      await expect(repository.findById('food-1')).rejects.toThrow(dbError);
    });
  });

  describe('findByBarcode', () => {
    it('should return food product by barcode', async () => {
      mockPrismaService.foodProduct.findUnique.mockResolvedValueOnce(mockFood);

      const result = await repository.findByBarcode('1234567890');

      expect(result).toEqual(mockFood);
      expect(mockPrismaService.foodProduct.findUnique).toHaveBeenCalledWith({
        where: { barcode: '1234567890' },
        include: FOOD_PRODUCT_WITH_RELATIONS_INCLUDE,
      });
    });

    it('should throw error when database fails', async () => {
      const dbError = new Error('Database error');
      mockPrismaService.foodProduct.findUnique.mockRejectedValueOnce(dbError);

      await expect(repository.findByBarcode('1234567890')).rejects.toThrow(
        dbError,
      );
    });
  });

  describe('create', () => {
    it('should create new food product', async () => {
      const createDto: FoodProductCreateInput = {
        name: 'New Food',
        description: 'New Description',
        barcode: '9876543210',
        createdBy: 'user-1',
      };
      const userId = 'user-1';
      mockPrismaService.foodProduct.create.mockResolvedValueOnce(mockFood);

      const result = await repository.create({
        ...createDto,
        createdBy: userId,
      });

      expect(result).toEqual(mockFood);
      expect(mockPrismaService.foodProduct.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...createDto,
          createdBy: userId,
        }),
      });
    });

    it('should throw error for duplicate barcode', async () => {
      const createDto: FoodProductCreateInput = {
        name: 'New Food',
        createdBy: 'user-1',
      };
      const userId = 'user-1';
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '4.0.0' },
      );
      mockPrismaService.foodProduct.create.mockRejectedValueOnce(prismaError);

      await expect(
        repository.create({ ...createDto, createdBy: userId }),
      ).rejects.toThrow(
        'FoodProduct with this barcode or OpenFoodFacts ID already exists',
      );
    });
  });

  describe('update', () => {
    it('should update food product', async () => {
      const updateDto: UpdateFoodProductDto = {
        name: 'Updated Food',
        description: 'Updated Description',
      };
      mockPrismaService.foodProduct.update.mockResolvedValueOnce({
        ...mockFood,
        ...updateDto,
      });

      const result = await repository.update('food-1', updateDto);

      expect(result).toEqual({ ...mockFood, ...updateDto });
      expect(mockPrismaService.foodProduct.update).toHaveBeenCalledWith({
        where: { id: 'food-1' },
        data: expect.objectContaining(updateDto),
      });
    });

    it('should throw error when food product not found', async () => {
      const updateDto: UpdateFoodProductDto = { name: 'Updated Food' };
      const prismaError = new PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '4.0.0' },
      );
      mockPrismaService.foodProduct.update.mockRejectedValueOnce(prismaError);

      await expect(repository.update('nonexistent', updateDto)).rejects.toThrow(
        'FoodProduct not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete food product', async () => {
      mockPrismaService.foodProduct.delete.mockResolvedValueOnce(mockFood);

      await repository.delete('food-1');

      expect(mockPrismaService.foodProduct.delete).toHaveBeenCalledWith({
        where: { id: 'food-1' },
      });
    });

    it('should throw error when food product not found', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '4.0.0' },
      );
      mockPrismaService.foodProduct.delete.mockRejectedValueOnce(prismaError);

      await expect(repository.delete('nonexistent')).rejects.toThrow(
        prismaError,
      );
    });
  });

  describe('searchByName', () => {
    it('should search food products by name', async () => {
      mockPrismaService.foodProduct.findMany.mockResolvedValueOnce([mockFood]);

      const result = await repository.searchByName('test');

      expect(result).toEqual([mockFood]);
      expect(mockPrismaService.foodProduct.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'test',
            mode: 'insensitive',
          },
        },
        skip: undefined,
        take: undefined,
        orderBy: { createdAt: 'desc' },
        include: undefined,
      });
    });
  });

  describe('count', () => {
    it('should count food products', async () => {
      mockPrismaService.foodProduct.count.mockResolvedValueOnce(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaService.foodProduct.count).toHaveBeenCalledWith({
        where: undefined,
      });
    });

    it('should count food products with filter', async () => {
      const where = { name: 'test' };
      mockPrismaService.foodProduct.count.mockResolvedValueOnce(3);

      const result = await repository.count(where);

      expect(result).toBe(3);
      expect(mockPrismaService.foodProduct.count).toHaveBeenCalledWith({
        where,
      });
    });
  });

  describe('findWithPagination', () => {
    it('should return paginated food products with default options', async () => {
      mockPrismaService.foodProduct.findMany.mockResolvedValueOnce([mockFood]);
      mockPrismaService.foodProduct.count.mockResolvedValueOnce(1);

      const result = await repository.findWithPagination({});

      expect(result.data).toEqual([mockFood]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(mockPrismaService.foodProduct.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
        include: FOOD_PRODUCT_WITH_RELATIONS_INCLUDE,
      });
      expect(mockPrismaService.foodProduct.count).toHaveBeenCalledWith({
        where: undefined,
      });
    });

    it.each([
      [0, 10, 1],
      [10, 10, 2],
      [20, 10, 3],
      [0, 5, 1],
      [5, 5, 2],
      [10, 5, 3],
      [80, 20, 5],
    ])(
      'should calculate page correctly for skip %i and take %i (expected page: %i)',
      async (skip, take, expectedPage) => {
        const total = 100;
        mockPrismaService.foodProduct.findMany.mockResolvedValueOnce([
          mockFood,
        ]);
        mockPrismaService.foodProduct.count.mockResolvedValueOnce(total);

        const result = await repository.findWithPagination({ skip, take });

        expect(result.page).toBe(expectedPage);
        expect(result.limit).toBe(take);
        expect(mockPrismaService.foodProduct.findMany).toHaveBeenCalledWith({
          skip,
          take,
          where: undefined,
          orderBy: { createdAt: 'desc' },
          include: FOOD_PRODUCT_WITH_RELATIONS_INCLUDE,
        });
      },
    );

    it('should calculate totalPages correctly', async () => {
      const total = 25;
      const take = 10;
      mockPrismaService.foodProduct.findMany.mockResolvedValueOnce([mockFood]);
      mockPrismaService.foodProduct.count.mockResolvedValueOnce(total);

      const result = await repository.findWithPagination({ skip: 0, take });

      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(mockPrismaService.foodProduct.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
        include: FOOD_PRODUCT_WITH_RELATIONS_INCLUDE,
      });
    });

    it('should handle pagination with where clause', async () => {
      const where: Prisma.FoodProductWhereInput = {
        name: { contains: 'test' },
      };
      mockPrismaService.foodProduct.findMany.mockResolvedValueOnce([mockFood]);
      mockPrismaService.foodProduct.count.mockResolvedValueOnce(5);

      const result = await repository.findWithPagination({
        skip: 0,
        take: 10,
        where,
      });

      expect(result.data).toEqual([mockFood]);
      expect(mockPrismaService.foodProduct.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where,
        orderBy: { createdAt: 'desc' },
        include: FOOD_PRODUCT_WITH_RELATIONS_INCLUDE,
      });
      expect(mockPrismaService.foodProduct.count).toHaveBeenCalledWith({
        where,
      });
    });

    it('should handle pagination with custom orderBy', async () => {
      const orderBy: Prisma.FoodProductOrderByWithRelationInput = {
        name: 'asc',
      };
      mockPrismaService.foodProduct.findMany.mockResolvedValueOnce([mockFood]);
      mockPrismaService.foodProduct.count.mockResolvedValueOnce(10);

      const result = await repository.findWithPagination({
        skip: 0,
        take: 10,
        orderBy,
      });

      expect(result.data).toEqual([mockFood]);
      expect(mockPrismaService.foodProduct.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: undefined,
        orderBy,
        include: FOOD_PRODUCT_WITH_RELATIONS_INCLUDE,
      });
    });

    it('should handle empty result set', async () => {
      mockPrismaService.foodProduct.findMany.mockResolvedValueOnce([]);
      mockPrismaService.foodProduct.count.mockResolvedValueOnce(0);

      const result = await repository.findWithPagination({
        skip: 0,
        take: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(0);
    });

    it('should throw error when database query fails', async () => {
      const dbError = new Error('Database error');
      mockPrismaService.foodProduct.findMany.mockRejectedValueOnce(dbError);

      await expect(
        repository.findWithPagination({ skip: 0, take: 10 }),
      ).rejects.toThrow(dbError);
    });

    it('should throw error when count query fails', async () => {
      const dbError = new Error('Database error');
      mockPrismaService.foodProduct.findMany.mockResolvedValueOnce([mockFood]);
      mockPrismaService.foodProduct.count.mockRejectedValueOnce(dbError);

      await expect(
        repository.findWithPagination({ skip: 0, take: 10 }),
      ).rejects.toThrow(dbError);
    });

    it('should handle skip that is not a multiple of take', async () => {
      mockPrismaService.foodProduct.findMany.mockResolvedValueOnce([mockFood]);
      mockPrismaService.foodProduct.count.mockResolvedValueOnce(100);

      const result = await repository.findWithPagination({ skip: 5, take: 10 });

      expect(result.page).toBe(1);
      expect(mockPrismaService.foodProduct.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
        include: FOOD_PRODUCT_WITH_RELATIONS_INCLUDE,
      });
    });

    it('should handle edge case with total exactly divisible by take', async () => {
      const total = 100;
      const take = 10;
      mockPrismaService.foodProduct.findMany.mockResolvedValueOnce([mockFood]);
      mockPrismaService.foodProduct.count.mockResolvedValueOnce(total);

      const result = await repository.findWithPagination({ skip: 90, take });

      expect(result.total).toBe(100);
      expect(result.totalPages).toBe(10);
      expect(result.page).toBe(10);
    });

    it('should handle edge case with total not exactly divisible by take', async () => {
      const total = 25;
      const take = 10;
      mockPrismaService.foodProduct.findMany.mockResolvedValueOnce([mockFood]);
      mockPrismaService.foodProduct.count.mockResolvedValueOnce(total);

      const result = await repository.findWithPagination({ skip: 20, take });

      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(3);
    });
  });
});
