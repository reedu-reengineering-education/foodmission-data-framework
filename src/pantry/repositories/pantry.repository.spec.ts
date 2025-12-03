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
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
    });
  });

  describe('create', () => {
    it('should create a new pantry when valid data is provided', async () => {
      const createDto = {
        title: 'New Pantry',
        userId: TEST_IDS.USER,
      };

      mockPrismaService.pantry.create.mockResolvedValue({
        id: `${TEST_IDS.PANTRY}-2`,
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.create(createDto);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(createDto.title);
      expect(result.userId).toBe(createDto.userId);
      expect(prisma.pantry.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw error when creation fails', async () => {
      const createDto = {
        title: 'New Pantry',
        userId: TEST_IDS.USER,
      };

      mockPrismaService.pantry.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(repository.create(createDto)).rejects.toThrow();
    });

    it('should throw specific error for duplicate title (composite unique constraint)', async () => {
      const createDto = {
        title: 'Existing Pantry',
        userId: TEST_IDS.USER,
      };

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint violation',
        {
          code: 'P2002',
          clientVersion: '1.0.0',
          meta: {
            target: ['userId', 'title'],
          },
        },
      );

      mockPrismaService.pantry.create.mockRejectedValue(prismaError);

      await expect(repository.create(createDto)).rejects.toThrow(
        'A pantry with this title already exists for this user.',
      );
    });

    it('should throw generic error for other unique constraint violations', async () => {
      const createDto = {
        title: 'New Pantry',
        userId: TEST_IDS.USER,
      };

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint violation',
        {
          code: 'P2002',
          clientVersion: '1.0.0',
          meta: {
            target: ['id'],
          },
        },
      );

      mockPrismaService.pantry.create.mockRejectedValue(prismaError);

      await expect(repository.create(createDto)).rejects.toThrow(
        'Failed to create pantry',
      );
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

    it('should throw error when update fails', async () => {
      mockPrismaService.pantry.update.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(
        repository.update(TEST_IDS.PANTRY, { title: 'New Title' }),
      ).rejects.toThrow('Failed to update pantry');
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

    it('should throw error when pantry not found during deletion', async () => {
      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      };
      mockPrismaService.pantry.delete.mockRejectedValue(prismaError);

      await expect(repository.delete('non-existent-id')).rejects.toThrow(
        'Failed to delete pantry',
      );
    });
  });
});
