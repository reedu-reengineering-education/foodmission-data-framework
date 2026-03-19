import { Test, TestingModule } from '@nestjs/testing';
import { PantryRepository } from './pantry.repository';
import { PrismaService } from '../../database/prisma.service';
import { Pantry } from '@prisma/client';
import { TEST_IDS } from '../../common/test-utils/test-constants';

describe('PantryRepository', () => {
  let repository: PantryRepository;
  let prisma: PrismaService;

  const mockPantry: Pantry = {
    id: TEST_IDS.PANTRY,
    userId: TEST_IDS.USER,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPantryWithRelations = {
    ...mockPantry,
    items: [
      {
        id: TEST_IDS.PANTRY_ITEM,
        quantity: 1,
        unit: 'PIECES',
        notes: null,
        expiryDate: new Date('2024-12-31'),
        pantryId: TEST_IDS.PANTRY,
        itemType: 'food',
        foodId: TEST_IDS.FOOD,
        foodCategoryId: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        food: {
          id: TEST_IDS.FOOD,
          name: 'Tomatoes',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      },
    ],
  };

  const mockPrismaService = {
    pantry: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
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
      mockPrismaService.pantry.findUnique.mockResolvedValue(
        mockPantryWithRelations,
      );

      const result = await repository.findByUserId(TEST_IDS.USER);

      expect(result).toEqual(mockPantryWithRelations);
      expect(prisma.pantry.findUnique).toHaveBeenCalledWith({
        where: { userId: TEST_IDS.USER },
        include: {
          items: {
            include: {
              food: true,
              foodCategory: true,
            },
          },
        },
      });
      expect(prisma.pantry.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should return null if pantry does not exist for userId', async () => {
      mockPrismaService.pantry.findUnique.mockResolvedValue(null);

      const result = await repository.findByUserId('non-existent-user');

      expect(result).toBeNull();
      expect(prisma.pantry.findUnique).toHaveBeenCalledWith({
        where: { userId: 'non-existent-user' },
        include: {
          items: {
            include: {
              food: true,
              foodCategory: true,
            },
          },
        },
      });
    });
  });

  describe('getOrCreate', () => {
    it('should return existing pantry if it exists', async () => {
      mockPrismaService.pantry.upsert.mockResolvedValue(
        mockPantryWithRelations,
      );

      const result = await repository.getOrCreate(TEST_IDS.USER);

      expect(result).toEqual(mockPantryWithRelations);
      expect(prisma.pantry.upsert).toHaveBeenCalledWith({
        where: { userId: TEST_IDS.USER },
        create: { userId: TEST_IDS.USER },
        update: {},
        include: {
          items: {
            include: {
              food: true,
              foodCategory: true,
            },
          },
        },
      });
    });

    it('should create new pantry if it does not exist', async () => {
      const newPantry = {
        id: `${TEST_IDS.PANTRY}-new`,
        userId: TEST_IDS.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      };

      mockPrismaService.pantry.upsert.mockResolvedValue(newPantry);

      const result = await repository.getOrCreate(TEST_IDS.USER);

      expect(result).toEqual(newPantry);
      expect(prisma.pantry.upsert).toHaveBeenCalledWith({
        where: { userId: TEST_IDS.USER },
        create: { userId: TEST_IDS.USER },
        update: {},
        include: {
          items: {
            include: {
              food: true,
              foodCategory: true,
            },
          },
        },
      });
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
              foodCategory: true,
            },
          },
        },
      });
    });

    it('should return null if pantry not found', async () => {
      mockPrismaService.pantry.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
      expect(prisma.pantry.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
        include: {
          items: {
            include: {
              food: true,
              foodCategory: true,
            },
          },
        },
      });
    });
  });
});
