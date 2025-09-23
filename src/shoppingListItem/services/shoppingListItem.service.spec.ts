import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ShoppingListItemService } from '../services/shoppingListItem.service';
import { PrismaService } from '../../database/prisma.service';
import { ShoppingListItemRepository } from '../repositories/shoppingListItem.repository';
import { CreateShoppingListItemDto } from '../dto/create-soppingListItem.dto';
import { UpdateShoppingListItemDto } from '../dto/update-soppingListItem.dto';
import { QueryShoppingListItemDto } from '../dto/query-soppingListItem.dto';

describe('ShoppingListItemService', () => {
  let service: ShoppingListItemService;
  let repository: jest.Mocked<ShoppingListItemRepository>;
  let prismaService: PrismaService;

  const mockPrismaService = {
    shoppingList: {
      findFirst: jest.fn(),
    },
    food: {
      findUnique: jest.fn(),
    },
    shoppingListItem: {
      create: jest.fn(),
    },
  };

  const mockShoppingListItem = {
    id: '1',
    quantity: 2,
    unit: 'kg',
    notes: null,
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

  const mockShoppingList = {
    id: 'list-1',
    title: 'Test List',
    userId: 'user-1',
  };

  const mockFood = {
    id: 'food-1',
    name: 'Test Food',
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findByShoppingListId: jest.fn(),
      findById: jest.fn(),
      findByShoppingListAndFood: jest.fn(),
      update: jest.fn(),
      toggleChecked: jest.fn(),
      delete: jest.fn(),
      clearCheckedItems: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShoppingListItemService,
        {
          provide: ShoppingListItemRepository,
          useValue: mockRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ShoppingListItemService>(ShoppingListItemService);
    repository = module.get(ShoppingListItemRepository);
    prismaService = module.get<PrismaService>(PrismaService);

    // Mock logger to avoid undefined errors
    service.logger = { log: jest.fn() };

    // Mock die Transformation mit korrektem Typing
    jest
      .spyOn(service, 'transformToResponseDto' as any)
      .mockImplementation((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes === null ? undefined : item.notes,
        checked: item.checked,
        shoppingListId: item.shoppingListId,
        foodId: item.foodId,
        shoppingList: item.shoppingList,
        food: item.food,
      }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateShoppingListItemDto = {
      quantity: 2,
      unit: 'kg',
      notes: 'Test notes',
      checked: false,
      shoppingListId: 'list-1',
      foodId: 'food-1',
    };

    it('should create a shopping list item successfully', async () => {
      // Arrange
      // Mock die Prisma-Aufrufe für die Validierungen
      mockPrismaService.shoppingList.findFirst.mockResolvedValue(
        mockShoppingList,
      );
      mockPrismaService.food.findUnique.mockResolvedValue(mockFood);
      repository.findByShoppingListAndFood.mockResolvedValue(null);
      mockPrismaService.shoppingListItem.create.mockResolvedValue(
        mockShoppingListItem,
      );

      // Act
      const result = await service.create(createDto, 'user-1');

      // Assert
      expect(mockPrismaService.shoppingList.findFirst).toHaveBeenCalledWith({
        where: { id: 'list-1', userId: 'user-1' },
      });
      expect(mockPrismaService.food.findUnique).toHaveBeenCalledWith({
        where: { id: 'food-1' },
      });
      expect(repository.findByShoppingListAndFood).toHaveBeenCalledWith(
        'list-1',
        'food-1',
      );
      expect(mockPrismaService.shoppingListItem.create).toHaveBeenCalledWith({
        data: {
          quantity: 2,
          unit: 'kg',
          notes: 'Test notes',
          checked: false,
          shoppingListId: 'list-1',
          foodId: 'food-1',
        },
        include: {
          shoppingList: true,
          food: true,
        },
      });

      expect(result.id).toBe('1');
      expect(result.quantity).toBe(2);
    });

    it('should throw NotFoundException if shopping list not found', async () => {
      // Arrange
      mockPrismaService.shoppingList.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );

      // Stelle sicher, dass nachfolgende Schritte nicht ausgeführt werden
      expect(mockPrismaService.food.findUnique).not.toHaveBeenCalled();
      expect(repository.findByShoppingListAndFood).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if food not found', async () => {
      // Arrange
      mockPrismaService.shoppingList.findFirst.mockResolvedValue(
        mockShoppingList,
      );
      mockPrismaService.food.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if item already exists', async () => {
      // Arrange
      mockPrismaService.shoppingList.findFirst.mockResolvedValue(
        mockShoppingList,
      );
      mockPrismaService.food.findUnique.mockResolvedValue(mockFood);
      repository.findByShoppingListAndFood.mockResolvedValue(
        mockShoppingListItem,
      );

      // Act & Assert
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        ConflictException,
      );

      // Stelle sicher, dass create nicht aufgerufen wird, wenn Item bereits existiert
      expect(mockPrismaService.shoppingListItem.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on repository error', async () => {
      // Arrange
      mockPrismaService.shoppingList.findFirst.mockResolvedValue(
        mockShoppingList,
      );
      mockPrismaService.food.findUnique.mockResolvedValue(mockFood);
      repository.findByShoppingListAndFood.mockResolvedValue(null);
      mockPrismaService.shoppingListItem.create.mockRejectedValue(
        new Error('Database error'),
      );

      // Act & Assert
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all shopping list items with filters', async () => {
      // Arrange
      const query: QueryShoppingListItemDto = {
        shoppingListId: 'list-1',
        checked: false,
      };

      // Mock die Rückgabe so, wie sie der Service tatsächlich strukturiert
      repository.findMany.mockResolvedValue([mockShoppingListItem]);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(repository.findMany).toHaveBeenCalledWith({
        shoppingListId: 'list-1',
        foodId: undefined,
        checked: false,
        unit: undefined,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id');
    });

    it('should handle unit filter with case-insensitive search', async () => {
      // Arrange
      const query: QueryShoppingListItemDto = {
        unit: 'KG',
      };
      repository.findMany.mockResolvedValue([mockShoppingListItem]);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(repository.findMany).toHaveBeenCalledWith({
        shoppingListId: undefined,
        foodId: undefined,
        checked: undefined,
        unit: 'KG',
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findByShoppingList', () => {
    it('should return items for a shopping list', async () => {
      // Arrange
      mockPrismaService.shoppingList.findFirst.mockResolvedValue(
        mockShoppingList,
      );
      repository.findByShoppingListId.mockResolvedValue([mockShoppingListItem]);

      // Act
      const result = await service.findByShoppingList('list-1', 'user-1');

      // Assert
      expect(mockPrismaService.shoppingList.findFirst).toHaveBeenCalledWith({
        where: { id: 'list-1', userId: 'user-1' },
      });
      expect(repository.findByShoppingListId).toHaveBeenCalledWith(
        'list-1',
        'user-1',
      );
      expect(result.data).toHaveLength(1);
    });

    it('should throw NotFoundException when shopping list not found', async () => {
      // Arrange
      mockPrismaService.shoppingList.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findByShoppingList('list-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return a shopping list item by id', async () => {
      // Arrange
      repository.findById.mockResolvedValue(mockShoppingListItem);

      // Act
      const result = await service.findById('1', 'user-1');

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(result).toHaveProperty('id');
      // Passe je nach tatsächlicher Transformation an:
      // expect(result.notes).toBeUndefined(); // falls notes transformiert wird
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not have access', async () => {
      // Arrange
      const itemWithDifferentUser = {
        ...mockShoppingListItem,
        shoppingList: {
          ...mockShoppingListItem.shoppingList,
          userId: 'other-user',
        },
      };
      repository.findById.mockResolvedValue(itemWithDifferentUser);

      // Act & Assert
      await expect(service.findById('1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update a shopping list item', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListItemDto = {
        quantity: 5,
        checked: true,
      };

      const updatedItem = {
        ...mockShoppingListItem,
        quantity: 5,
        checked: true,
      };

      repository.findById.mockResolvedValue(mockShoppingListItem);
      repository.update.mockResolvedValue(updatedItem);

      const result = await service.update(itemId, updateDto, userId);

      expect(repository.findById).toHaveBeenCalledWith(itemId);
      expect(repository.update).toHaveBeenCalledWith(itemId, updateDto);
      expect(result.quantity).toBe(5);
      expect(result.checked).toBe(true);
    });
  });
});
