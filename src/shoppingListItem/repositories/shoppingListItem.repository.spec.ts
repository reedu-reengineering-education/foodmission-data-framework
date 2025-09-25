import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { ShoppingListItemRepository } from '../repositories/shoppingListItem.repository';
import { CreateShoppingListItemDto } from '../dto/create-soppingListItem.dto';

describe('ShoppingListItemRepository', () => {
  let repository: ShoppingListItemRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    shoppingListItem: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    shoppingList: {
      count: jest.fn(),
    },
    food: {
      count: jest.fn(),
    },
  };

  const mockShoppingListItem = {
    id: '1',
    quantity: 2,
    unit: 'kg',
    notes: 'Test notes',
    checked: false,
    shoppingListId: 'list-1',
    foodId: 'food-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    shoppingList: {
      id: 'list-1',
      title: 'Test List',
      userId: 'user-1',
    },
    food: {
      id: 'food-1',
      name: 'Test Food',
      category: 'Test Category',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShoppingListItemRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<ShoppingListItemRepository>(
      ShoppingListItemRepository,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a shopping list item with relations', async () => {
      // Arrange
      const createDto: CreateShoppingListItemDto = {
        quantity: 2,
        unit: 'kg',
        notes: 'Test notes',
        checked: false,
        shoppingListId: 'list-1',
        foodId: 'food-1',
      };

      mockPrismaService.shoppingListItem.create.mockResolvedValue(
        mockShoppingListItem,
      );

      // Act
      const result = await repository.create(createDto);

      // Assert
      expect(mockPrismaService.shoppingListItem.create).toHaveBeenCalledWith({
        data: createDto,
        include: {
          shoppingList: true,
          food: true,
        },
      });
      expect(result).toEqual(mockShoppingListItem);
      expect(result.shoppingListId).toBeDefined();
      expect(result.foodId).toBeDefined();
    });
  });

  describe('findMany', () => {
    it('should find items with basic filter', async () => {
      // Arrange
      const filter = { shoppingListId: 'list-1' };
      mockPrismaService.shoppingListItem.findMany.mockResolvedValue([
        mockShoppingListItem,
      ]);

      // Act
      const result = await repository.findMany(filter);

      // Assert
      expect(mockPrismaService.shoppingListItem.findMany).toHaveBeenCalledWith({
        where: { shoppingListId: 'list-1' },
        include: {
          shoppingList: true,
          food: true,
        },
        orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
      });
      expect(result).toEqual([mockShoppingListItem]);
    });

    it('should find items with complex filter', async () => {
      // Arrange
      const filter = {
        shoppingListId: 'list-1',
        foodId: 'food-1',
        checked: false,
        unit: 'kg',
        userId: 'user-1',
      };
      mockPrismaService.shoppingListItem.findMany.mockResolvedValue([
        mockShoppingListItem,
      ]);

      // Act
      const result = await repository.findMany(filter);

      // Assert
      expect(mockPrismaService.shoppingListItem.findMany).toHaveBeenCalledWith({
        where: {
          shoppingListId: 'list-1',
          foodId: 'food-1',
          checked: false,
          unit: { contains: 'kg', mode: 'insensitive' },
          shoppingList: { userId: 'user-1' },
        },
        include: {
          shoppingList: true,
          food: true,
        },
        orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
      });
      expect(result).toEqual([mockShoppingListItem]);
    });

    it('should find items with empty filter', async () => {
      // Arrange
      mockPrismaService.shoppingListItem.findMany.mockResolvedValue([
        mockShoppingListItem,
      ]);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(prismaService.shoppingListItem.findMany).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockShoppingListItem]);
    });
  });

  describe('findById', () => {
    it('should find item by id', async () => {
      // Arrange
      mockPrismaService.shoppingListItem.findUnique.mockResolvedValue(
        mockShoppingListItem,
      );

      // Act
      const result = await repository.findById('1');

      // Assert
      expect(
        mockPrismaService.shoppingListItem.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          shoppingList: true,
          food: true,
        },
      });
      expect(result).toEqual(mockShoppingListItem);
    });

    it('should return null if item not found', async () => {
      // Arrange
      mockPrismaService.shoppingListItem.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByShoppingListAndFood', () => {
    it('should find item by shopping list and food', async () => {
      // Arrange
      mockPrismaService.shoppingListItem.findUnique.mockResolvedValue(
        mockShoppingListItem,
      );

      // Act
      const result = await repository.findByShoppingListAndFood(
        'list-1',
        'food-1',
      );

      // Assert
      expect(
        mockPrismaService.shoppingListItem.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          shoppingListId_foodId: {
            shoppingListId: 'list-1',
            foodId: 'food-1',
          },
        },
        include: {
          shoppingList: true,
          food: true,
        },
      });
      expect(result).toEqual(mockShoppingListItem);
    });
  });

  describe('update', () => {
    it('should update item', async () => {
      // Arrange
      const updateData = { quantity: 5, checked: true };
      const updatedItem = { ...mockShoppingListItem, ...updateData };
      mockPrismaService.shoppingListItem.update.mockResolvedValue(updatedItem);

      // Act
      const result = await repository.update('1', updateData);

      // Assert
      expect(mockPrismaService.shoppingListItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
        include: {
          shoppingList: true,
          food: true,
        },
      });
      expect(result).toEqual(updatedItem);
    });
  });

  describe('toggleChecked', () => {
    it('should toggle checked status', async () => {
      // Arrange
      const currentItem = { checked: false };
      const toggledItem = { ...mockShoppingListItem, checked: true };

      mockPrismaService.shoppingListItem.findUnique.mockResolvedValue(
        currentItem,
      );
      mockPrismaService.shoppingListItem.update.mockResolvedValue(toggledItem);

      // Act
      const result = await repository.toggleChecked('1');

      // Assert
      expect(
        mockPrismaService.shoppingListItem.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: '1' },
        select: { checked: true },
      });
      expect(mockPrismaService.shoppingListItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { checked: true },
        include: {
          shoppingList: true,
          food: true,
        },
      });
      expect(result).toEqual(toggledItem);
    });

    it('should throw error if item not found during toggle', async () => {
      // Arrange
      mockPrismaService.shoppingListItem.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(repository.toggleChecked('non-existent')).rejects.toThrow(
        'Shopping list item not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete item', async () => {
      // Arrange
      mockPrismaService.shoppingListItem.delete.mockResolvedValue(
        mockShoppingListItem,
      );

      // Act
      await repository.delete('1');

      // Assert
      expect(mockPrismaService.shoppingListItem.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });

  describe('clearCheckedItems', () => {
    it('should clear checked items for shopping list', async () => {
      // Arrange
      const deleteResult = { count: 3 };
      mockPrismaService.shoppingListItem.deleteMany.mockResolvedValue(
        deleteResult,
      );

      // Act
      const result = await repository.clearCheckedItems('list-1', 'user-1');

      // Assert
      expect(
        mockPrismaService.shoppingListItem.deleteMany,
      ).toHaveBeenCalledWith({
        where: {
          shoppingListId: 'list-1',
          checked: true,
          shoppingList: { userId: 'user-1' },
        },
      });
      expect(result).toEqual(deleteResult);
    });

    it('should clear checked items without user filter', async () => {
      // Arrange
      const deleteResult = { count: 2 };
      mockPrismaService.shoppingListItem.deleteMany.mockResolvedValue(
        deleteResult,
      );

      // Act
      const result = await repository.clearCheckedItems('list-1');

      // Assert
      expect(
        mockPrismaService.shoppingListItem.deleteMany,
      ).toHaveBeenCalledWith({
        where: {
          shoppingListId: 'list-1',
          checked: true,
        },
      });
      expect(result).toEqual(deleteResult);
    });
  });

  describe('count', () => {
    it('should count items with filter', async () => {
      // Arrange
      const filter = { shoppingListId: 'list-1', checked: false };
      mockPrismaService.shoppingListItem.count.mockResolvedValue(5);

      // Act
      const result = await repository.count(filter);

      // Assert
      expect(mockPrismaService.shoppingListItem.count).toHaveBeenCalledWith({
        where: {
          shoppingListId: 'list-1',
          checked: false,
        },
      });
      expect(result).toBe(5);
    });
  });
});
