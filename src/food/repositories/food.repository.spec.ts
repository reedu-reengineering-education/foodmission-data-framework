import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { FoodRepository, UpdateFoodDto } from './food.repository';
import { CreateFoodDto } from '../dto/create-food.dto';
import { PrismaService } from '../../database/prisma.service';

describe('FoodRepository', () => {
  let repository: FoodRepository;

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

  let mockPrismaService: any;

  beforeAll(() => {
    mockPrismaService = {
      food: {
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
        FoodRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<FoodRepository>(FoodRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all foods with default options', async () => {
      mockPrismaService.food.findMany.mockResolvedValueOnce([mockFood]);

      const result = await repository.findAll();

      expect(result).toEqual([mockFood]);
      expect(mockPrismaService.food.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        where: undefined,
        orderBy: { createdAt: 'desc' },
        include: undefined,
      });
    });

    it('should return foods with custom options', async () => {
      const options = {
        skip: 10,
        take: 5,
        where: { name: 'test' },
        orderBy: { name: 'asc' },
      };
      mockPrismaService.food.findMany.mockResolvedValueOnce([mockFood]);

      const result = await repository.findAll(options);

      expect(result).toEqual([mockFood]);
      expect(mockPrismaService.food.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        where: { name: 'test' },
        orderBy: { name: 'asc' },
        include: undefined,
      });
    });

    it('should throw error when database fails', async () => {
      const dbError = new Error('Database error');
      mockPrismaService.food.findMany.mockRejectedValueOnce(dbError);

      await expect(repository.findAll()).rejects.toThrow(dbError);
    });
  });

  describe('findById', () => {
    it('should return food by id', async () => {
      mockPrismaService.food.findUnique.mockResolvedValueOnce(mockFood);

      const result = await repository.findById('food-1');

      expect(result).toEqual(mockFood);
      expect(mockPrismaService.food.findUnique).toHaveBeenCalledWith({
        where: { id: 'food-1' },
      });
    });

    it('should return null when food not found', async () => {
      mockPrismaService.food.findUnique.mockResolvedValueOnce(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error when database fails', async () => {
      const dbError = new Error('Database error');
      mockPrismaService.food.findUnique.mockRejectedValueOnce(dbError);

      await expect(repository.findById('food-1')).rejects.toThrow(dbError);
    });
  });

  describe('findByBarcode', () => {
    it('should return food by barcode', async () => {
      mockPrismaService.food.findUnique.mockResolvedValueOnce(mockFood);

      const result = await repository.findByBarcode('1234567890');

      expect(result).toEqual(mockFood);
      expect(mockPrismaService.food.findUnique).toHaveBeenCalledWith({
        where: { barcode: '1234567890' },
      });
    });

    it('should throw error when database fails', async () => {
      const dbError = new Error('Database error');
      mockPrismaService.food.findUnique.mockRejectedValueOnce(dbError);

      await expect(repository.findByBarcode('1234567890')).rejects.toThrow(
        dbError,
      );
    });
  });

  describe('create', () => {
    it('should create new food', async () => {
      const createDto: CreateFoodDto = {
        name: 'New Food',
        description: 'New Description',
        barcode: '9876543210',
      };
      const userId = 'user-1';
      mockPrismaService.food.create.mockResolvedValueOnce(mockFood);

      const result = await repository.create({
        ...createDto,
        createdBy: userId,
      });

      expect(result).toEqual(mockFood);
      expect(mockPrismaService.food.create).toHaveBeenCalledWith({
        data: { ...createDto, createdBy: userId },
      });
    });

    it('should throw error for duplicate barcode', async () => {
      const createDto: CreateFoodDto = {
        name: 'New Food',
      };
      const userId = 'user-1';
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '4.0.0' },
      );
      mockPrismaService.food.create.mockRejectedValueOnce(prismaError);

      await expect(
        repository.create({ ...createDto, createdBy: userId }),
      ).rejects.toThrow(
        'Food with this barcode or OpenFoodFacts ID already exists',
      );
    });
  });

  describe('update', () => {
    it('should update food', async () => {
      const updateDto: UpdateFoodDto = {
        name: 'Updated Food',
        description: 'Updated Description',
      };
      mockPrismaService.food.update.mockResolvedValueOnce({
        ...mockFood,
        ...updateDto,
      });

      const result = await repository.update('food-1', updateDto);

      expect(result).toEqual({ ...mockFood, ...updateDto });
      expect(mockPrismaService.food.update).toHaveBeenCalledWith({
        where: { id: 'food-1' },
        data: updateDto,
      });
    });

    it('should throw error when food not found', async () => {
      const updateDto: UpdateFoodDto = { name: 'Updated Food' };
      const prismaError = new PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '4.0.0' },
      );
      mockPrismaService.food.update.mockRejectedValueOnce(prismaError);

      await expect(repository.update('nonexistent', updateDto)).rejects.toThrow(
        'Food not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete food', async () => {
      mockPrismaService.food.delete.mockResolvedValueOnce(mockFood);

      await repository.delete('food-1');

      expect(mockPrismaService.food.delete).toHaveBeenCalledWith({
        where: { id: 'food-1' },
      });
    });

    it('should throw error when food not found', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '4.0.0' },
      );
      mockPrismaService.food.delete.mockRejectedValueOnce(prismaError);

      await expect(repository.delete('nonexistent')).rejects.toThrow(
        prismaError,
      );
    });
  });

  describe('searchByName', () => {
    it('should search foods by name', async () => {
      mockPrismaService.food.findMany.mockResolvedValueOnce([mockFood]);

      const result = await repository.searchByName('test');

      expect(result).toEqual([mockFood]);
      expect(mockPrismaService.food.findMany).toHaveBeenCalledWith({
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
    it('should count foods', async () => {
      mockPrismaService.food.count.mockResolvedValueOnce(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaService.food.count).toHaveBeenCalledWith({
        where: undefined,
      });
    });

    it('should count foods with filter', async () => {
      const where = { name: 'test' };
      mockPrismaService.food.count.mockResolvedValueOnce(3);

      const result = await repository.count(where);

      expect(result).toBe(3);
      expect(mockPrismaService.food.count).toHaveBeenCalledWith({ where });
    });
  });
});
