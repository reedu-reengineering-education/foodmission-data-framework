import { Test, TestingModule } from '@nestjs/testing';
import { PantryRepository } from './pantry.repository';
import { PrismaService } from '../../database/prisma.service';
import { Pantry, Prisma } from '@prisma/client';
import { TEST_IDS, TEST_DATA } from '../../common/test-utils/test-constants';

describe('PantryRepository', () => {
  let repository: PantryRepository;
  let prisma: PrismaService;

  const mockPantry: Pantry = {
    id: TEST_IDS.PANTRY,
    title: TEST_DATA.PANTRY_TITLE,
    userId: TEST_IDS.USER,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPantryWithRelations = {
    ...mockPantry,
    items: [
      {
        id: TEST_IDS.PANTRY_ITEM,
        quantity: TEST_DATA.QUANTITY,
        unit: 'kg',
        notes: TEST_DATA.NOTES,
        expiryDate: new Date('2024-12-31'),
        pantryId: TEST_IDS.PANTRY,
        foodId: TEST_IDS.FOOD,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        food: {
          id: TEST_IDS.FOOD,
          name: 'Tomatoes',
          category: 'Vegetables',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      },
    ],
  };

  const mockPrismaService = {
    pantry: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PantryRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PantryRepository>(PantryRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should return a pantry with relations for a given userId', async () => {
      mockPrismaService.pantry.findFirst.mockResolvedValue(
        mockPantryWithRelations,
      );

      const result = await repository.findByUserId(TEST_IDS.USER);

      expect(result).toEqual(mockPantryWithRelations);
      expect(prisma.pantry.findFirst).toHaveBeenCalledWith({
        where: { userId: TEST_IDS.USER },
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.pantry.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should return null if pantry does not exist for userId', async () => {
      mockPrismaService.pantry.findFirst.mockResolvedValue(null);

      const result = await repository.findByUserId('non-existent-user');

      expect(result).toBeNull();
      expect(prisma.pantry.findFirst).toHaveBeenCalledWith({
        where: { userId: 'non-existent-user' },
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findAllByUserId', () => {
    it('should return all pantries with relations for a given userId', async () => {
      const pantries = [
        mockPantryWithRelations,
        {
          ...mockPantryWithRelations,
          id: `${TEST_IDS.PANTRY}-2`,
          title: TEST_DATA.PANTRY_TITLE_2,
        },
      ];
      mockPrismaService.pantry.findMany.mockResolvedValue(pantries);

      const result = await repository.findAllByUserId(TEST_IDS.USER);

      expect(result).toEqual(pantries);
      expect(result).toHaveLength(2);
      expect(prisma.pantry.findMany).toHaveBeenCalledWith({
        where: { userId: TEST_IDS.USER },
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.pantry.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if no pantries exist for userId', async () => {
      mockPrismaService.pantry.findMany.mockResolvedValue([]);

      const result = await repository.findAllByUserId('non-existent-user');

      expect(result).toEqual([]);
      expect(prisma.pantry.findMany).toHaveBeenCalledWith({
        where: { userId: 'non-existent-user' },
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.pantry.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('should create a new pantry with relations when valid data is provided', async () => {
      const createDto = {
        title: 'New Pantry',
        userId: TEST_IDS.USER,
      };

      const createdPantryWithRelations = {
        id: `${TEST_IDS.PANTRY}-2`,
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      };

      mockPrismaService.pantry.create.mockResolvedValue(
        createdPantryWithRelations,
      );

      const result = await repository.create(createDto);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(createDto.title);
      expect(result.userId).toBe(createDto.userId);
      expect(result).toHaveProperty('items');
      expect(prisma.pantry.create).toHaveBeenCalledWith({
        data: createDto,
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
      });
    });

    it('should throw error when creation fails', async () => {
      const createDto = {
        title: 'New Pantry',
        userId: TEST_IDS.USER,
      };

      const dbError = new Error('Database error');
      mockPrismaService.pantry.create.mockRejectedValue(dbError);

      await expect(repository.create(createDto)).rejects.toThrow(dbError);
    });
  });

  describe('findById', () => {
    it('should return a pantry with relations by id', async () => {
      mockPrismaService.pantry.findUnique.mockResolvedValue(
        mockPantryWithRelations,
      );

      const result = await repository.findById(TEST_IDS.PANTRY);

      expect(result).toEqual(mockPantryWithRelations);
      expect(prisma.pantry.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_IDS.PANTRY },
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
      });
    });

    it('should return null if pantry not found', async () => {
      mockPrismaService.pantry.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update pantry when valid data is provided', async () => {
      const updateDto = { title: 'Updated Pantry' };
      const updatedPantry = {
        ...mockPantryWithRelations,
        title: 'Updated Pantry',
      };

      mockPrismaService.pantry.update.mockResolvedValue(updatedPantry);

      const result = await repository.update(TEST_IDS.PANTRY, updateDto);

      expect(result.title).toBe('Updated Pantry');
      expect(prisma.pantry.update).toHaveBeenCalledWith({
        where: { id: TEST_IDS.PANTRY },
        data: updateDto,
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
      });
    });

    it('should throw error if update fails', async () => {
      const dbError = new Error('Update failed');
      mockPrismaService.pantry.update.mockRejectedValue(dbError);

      await expect(
        repository.update(TEST_IDS.PANTRY, { title: 'New Title' }),
      ).rejects.toThrow(dbError);
    });
  });

  describe('delete', () => {
    it('should delete pantry when it exists', async () => {
      mockPrismaService.pantry.delete.mockResolvedValue(mockPantry);

      await repository.delete(TEST_IDS.PANTRY);

      expect(prisma.pantry.delete).toHaveBeenCalledWith({
        where: { id: TEST_IDS.PANTRY },
      });
      expect(prisma.pantry.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw error if pantry not found during deletion', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '4.0.0' },
      );
      mockPrismaService.pantry.delete.mockRejectedValue(prismaError);

      await expect(repository.delete('non-existent-id')).rejects.toThrow(
        prismaError,
      );
    });
  });

  describe('count', () => {
    it('should return count of pantries', async () => {
      mockPrismaService.pantry.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(prisma.pantry.count).toHaveBeenCalledWith({ where: undefined });
    });

    it('should return count with filter', async () => {
      mockPrismaService.pantry.count.mockResolvedValue(2);

      const result = await repository.count({ userId: TEST_IDS.USER });

      expect(result).toBe(2);
      expect(prisma.pantry.count).toHaveBeenCalledWith({
        where: { userId: TEST_IDS.USER },
      });
    });
  });
});
