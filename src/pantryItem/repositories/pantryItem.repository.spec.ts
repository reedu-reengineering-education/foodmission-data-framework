import { Test, TestingModule } from '@nestjs/testing';
import { PantryItemRepository } from './pantryItem.repository';
import { PrismaService } from '../../database/prisma.service';
import { Unit } from '@prisma/client';
import { TEST_IDS, TEST_DATA, TEST_DATES } from '../../common/test-utils/test-constants';

describe('PantryItemRepository', () => {
  let repository: PantryItemRepository;
  let prisma: PrismaService;

  const mockPantryItem = {
    id: TEST_IDS.PANTRY_ITEM,
    quantity: TEST_DATA.QUANTITY,
    unit: 'kg',
    notes: TEST_DATA.NOTES,
    expiryDate: TEST_DATES.EXPIRY,
    pantryId: TEST_IDS.PANTRY,
    foodId: TEST_IDS.FOOD,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    pantry: {
      id: TEST_IDS.PANTRY,
      title: 'My Pantry',
      userId: TEST_IDS.USER,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    food: {
      id: TEST_IDS.FOOD,
      name: 'Tomatoes',
      category: 'Vegetables',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  };

  const mockPrismaService = {
    pantryItem: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PantryItemRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PantryItemRepository>(PantryItemRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new pantry item when valid data is provided', async () => {
      const createData = {
        pantryId: TEST_IDS.PANTRY,
        foodId: TEST_IDS.FOOD,
        quantity: TEST_DATA.QUANTITY,
        unit: Unit.KG,
        notes: TEST_DATA.NOTES,
        expiryDate: TEST_DATES.EXPIRY,
      };

      mockPrismaService.pantryItem.create.mockResolvedValue(mockPantryItem);

      const result = await repository.create(createData);

      expect(result).toEqual(mockPantryItem);
      expect(prisma.pantryItem.create).toHaveBeenCalledWith({
        data: {
          pantryId: createData.pantryId,
          foodId: createData.foodId,
          quantity: createData.quantity,
          unit: createData.unit,
          notes: createData.notes,
          expiryDate: createData.expiryDate,
        },
        include: {
          pantry: true,
          food: true,
        },
      });
    });

    it('should create pantry item without optional fields', async () => {
      const createData = {
        pantryId: TEST_IDS.PANTRY,
        foodId: TEST_IDS.FOOD,
        quantity: 3,
        unit: Unit.PIECES,
      };

      const itemWithoutOptionals = {
        ...mockPantryItem,
        notes: null,
        expiryDate: null,
      };

      mockPrismaService.pantryItem.create.mockResolvedValue(
        itemWithoutOptionals,
      );

      const result = await repository.create(createData);

      expect(result.notes).toBeNull();
      expect(result.expiryDate).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all pantry items when no filter is provided', async () => {
      const mockItems = [
        mockPantryItem,
        { ...mockPantryItem, id: `${TEST_IDS.PANTRY_ITEM}-2` },
      ];
      mockPrismaService.pantryItem.findMany.mockResolvedValue(mockItems);

      const result = await repository.findAll();

      expect(result).toEqual(mockItems);
      expect(result).toHaveLength(2);
      expect(prisma.pantryItem.findMany).toHaveBeenCalledWith({
        include: {
          pantry: true,
          food: true,
        },
      });
    });

    it('should return empty array when no items exist', async () => {
      mockPrismaService.pantryItem.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return a pantry item by id', async () => {
      mockPrismaService.pantryItem.findUnique.mockResolvedValue(mockPantryItem);

      const result = await repository.findById(TEST_IDS.PANTRY_ITEM);

      expect(result).toEqual(mockPantryItem);
      expect(prisma.pantryItem.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_IDS.PANTRY_ITEM },
        include: {
          pantry: true,
          food: true,
        },
      });
    });

    it('should return null if item not found', async () => {
      mockPrismaService.pantryItem.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should return all items when no filter provided', async () => {
      const mockItems = [mockPantryItem];
      mockPrismaService.pantryItem.findMany.mockResolvedValue(mockItems);

      const result = await repository.findMany({});

      expect(result).toEqual(mockItems);
      expect(prisma.pantryItem.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          pantry: true,
          food: true,
        },
      });
    });

    it('should filter items by foodId', async () => {
      mockPrismaService.pantryItem.findMany.mockResolvedValue([mockPantryItem]);

      const result = await repository.findMany({ foodId: TEST_IDS.FOOD });

      expect(result).toEqual([mockPantryItem]);
      expect(prisma.pantryItem.findMany).toHaveBeenCalledWith({
        where: {
          foodId: TEST_IDS.FOOD,
          expiryDate: undefined,
          unit: undefined,
        },
        include: {
          pantry: true,
          food: true,
        },
      });
    });

    it('should filter items by unit', async () => {
      mockPrismaService.pantryItem.findMany.mockResolvedValue([mockPantryItem]);

      const result = await repository.findMany({ unit: Unit.KG });

      expect(result).toEqual([mockPantryItem]);
      expect(prisma.pantryItem.findMany).toHaveBeenCalledWith({
        where: {
          foodId: undefined,
          expiryDate: undefined,
          unit: Unit.KG,
        },
        include: {
          pantry: true,
          food: true,
        },
      });
    });

    it('should filter items by multiple criteria', async () => {
      const filter = {
        foodId: TEST_IDS.FOOD,
        unit: Unit.KG,
      };

      mockPrismaService.pantryItem.findMany.mockResolvedValue([mockPantryItem]);

      const result = await repository.findMany(filter);

      expect(result).toEqual([mockPantryItem]);
      expect(prisma.pantryItem.findMany).toHaveBeenCalledWith({
        where: {
          foodId: TEST_IDS.FOOD,
          expiryDate: undefined,
          unit: Unit.KG,
        },
        include: {
          pantry: true,
          food: true,
        },
      });
    });
  });

  describe('update', () => {
    it('should update pantry item when valid data is provided', async () => {
      const updateData = {
        quantity: 10,
        notes: 'Updated notes',
      };

      const updatedItem = {
        ...mockPantryItem,
        ...updateData,
      };

      mockPrismaService.pantryItem.update.mockResolvedValue(updatedItem);

      const result = await repository.update(TEST_IDS.PANTRY_ITEM, updateData);

      expect(result.quantity).toBe(10);
      expect(result.notes).toBe('Updated notes');
      expect(prisma.pantryItem.update).toHaveBeenCalledWith({
        where: { id: TEST_IDS.PANTRY_ITEM },
        data: updateData,
        include: {
          pantry: true,
          food: true,
        },
      });
    });
  });

  describe('delete', () => {
    it('should delete pantry item when it exists', async () => {
      mockPrismaService.pantryItem.delete.mockResolvedValue(mockPantryItem);

      await repository.delete(TEST_IDS.PANTRY_ITEM);

      expect(prisma.pantryItem.delete).toHaveBeenCalledWith({
        where: { id: TEST_IDS.PANTRY_ITEM },
      });
      expect(prisma.pantryItem.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('findFoodInPantry', () => {
    it('should find a specific food item in a pantry', async () => {
      mockPrismaService.pantryItem.findFirst.mockResolvedValue(mockPantryItem);

      const result = await repository.findFoodInPantry(
        TEST_IDS.PANTRY,
        TEST_IDS.FOOD,
      );

      expect(result).toEqual(mockPantryItem);
      expect(prisma.pantryItem.findFirst).toHaveBeenCalledWith({
        where: {
          pantryId: TEST_IDS.PANTRY,
          foodId: TEST_IDS.FOOD,
        },
        include: {
          pantry: true,
          food: true,
        },
      });
    });

    it('should return null if food not found in pantry', async () => {
      mockPrismaService.pantryItem.findFirst.mockResolvedValue(null);

      const result = await repository.findFoodInPantry(
        TEST_IDS.PANTRY,
        'food-999',
      );

      expect(result).toBeNull();
    });
  });
});
