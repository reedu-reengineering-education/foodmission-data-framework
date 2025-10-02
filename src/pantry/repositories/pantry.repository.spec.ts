import { Test, TestingModule } from '@nestjs/testing';
import { PantryRepository } from './pantry.repository';
import { PrismaService } from 'src/database/prisma.service';
import { Pantry } from '@prisma/client';

describe('PantryRepository', () => {
  let repository: PantryRepository;
  let prisma: PrismaService;

  const mockPantry: Pantry = {
    id: 'pantry-1',
    title: 'My Pantry',
    userId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPantryWithRelations = {
    ...mockPantry,
    items: [
      {
        id: 'item-1',
        quantity: 5,
        unit: 'kg',
        notes: 'Fresh',
        location: 'Shelf A',
        expiryDate: new Date('2024-12-31'),
        pantryId: 'pantry-1',
        foodId: 'food-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        food: {
          id: 'food-1',
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
      mockPrismaService.pantry.findUnique.mockResolvedValue(
        mockPantryWithRelations,
      );

      const result = await repository.findByUserId('user-1');

      expect(result).toEqual(mockPantryWithRelations);
      expect(prisma.pantry.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: {
          items: {
            include: {
              food: true,
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
            },
          },
        },
      });
    });
  });

  describe('create', () => {
    it('should create a new pantry', async () => {
      const createDto = {
        title: 'New Pantry',
        userId: 'user-2',
      };

      mockPrismaService.pantry.create.mockResolvedValue({
        id: 'pantry-2',
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

    // KORREKTUR: Die catch-Anweisung im Original-Code ist syntaktisch falsch
    // Sie sollte innerhalb einer try-catch-Block sein oder entfernt werden
    it('should throw error if creation fails', async () => {
      const createDto = {
        title: 'New Pantry',
        userId: 'user-2',
      };

      mockPrismaService.pantry.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(repository.create(createDto)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should return a pantry with relations by id', async () => {
      mockPrismaService.pantry.findUnique.mockResolvedValue(
        mockPantryWithRelations,
      );

      const result = await repository.findById('pantry-1');

      expect(result).toEqual(mockPantryWithRelations);
      expect(prisma.pantry.findUnique).toHaveBeenCalledWith({
        where: { id: 'pantry-1' },
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
    it('should update a pantry', async () => {
      const updateDto = { title: 'Updated Pantry' };
      const updatedPantry = {
        ...mockPantryWithRelations,
        title: 'Updated Pantry',
      };

      mockPrismaService.pantry.update.mockResolvedValue(updatedPantry);

      const result = await repository.update('pantry-1', updateDto);

      expect(result.title).toBe('Updated Pantry');
      expect(prisma.pantry.update).toHaveBeenCalledWith({
        where: { id: 'pantry-1' },
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
      mockPrismaService.pantry.update.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(
        repository.update('pantry-1', { title: 'New Title' }),
      ).rejects.toThrow('Failed to update pantry');
    });
  });

  describe('delete', () => {
    it('should delete a pantry', async () => {
      mockPrismaService.pantry.delete.mockResolvedValue(mockPantry);

      await repository.delete('pantry-1');

      expect(prisma.pantry.delete).toHaveBeenCalledWith({
        where: { id: 'pantry-1' },
      });
      expect(prisma.pantry.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw error if pantry not found during deletion', async () => {
      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      };
      mockPrismaService.pantry.delete.mockRejectedValue(prismaError);

      await expect(repository.delete('non-existent-id')).rejects.toThrow(
        'Pantry not found',
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

      const result = await repository.count({ userId: 'user-1' });

      expect(result).toBe(2);
      expect(prisma.pantry.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });
});
