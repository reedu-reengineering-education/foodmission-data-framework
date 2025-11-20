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
import { PantryItemService } from '../../pantryItem/services/pantryItem.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { FoodRepository } from '../../food/repositories/food.repository';
import { ShoppingListRepository } from '../../shoppingList/repositories/shoppingList.repository';

describe('ShoppingListItemService', () => {
  let service: ShoppingListItemService;
  let repository: jest.Mocked<ShoppingListItemRepository>;
  let pantryItemService: PantryItemService;
  let userRepository: UserRepository;

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
    unit: 'KG' as const,
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
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    food: {
      name: 'Test Food',
      id: 'food-1',
      description: null,
      barcode: null,
      openFoodFactsId: null,
      createdBy: 'user-1',
      category: 'Test Category',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  };

  const mockShoppingList = {
    id: 'list-1',
    title: 'Test List',
    userId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockFood = {
    id: 'food-1',
    name: 'Test Food',
  };

  const mockUser = {
    id: 'user-1',
    checkedShoppingListItemInPantry: true,
  };

  const mockUserRepository = {
    findById: jest.fn(),
  };

  const mockPantryItemService = {
    createFromShoppingList: jest.fn(),
  };

  const mockFoodRepository = {
    findById: jest.fn(),
  };

  const mockShoppingListRepository = {
    findById: jest.fn(),
  };

  const mockUpdatedItem = { ...mockShoppingListItem, checked: true };

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
        {
          provide: PantryItemService,
          useValue: mockPantryItemService,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: FoodRepository,
          useValue: mockFoodRepository,
        },
        {
          provide: ShoppingListRepository,
          useValue: mockShoppingListRepository,
        },
      ],
    }).compile();

    service = module.get<ShoppingListItemService>(ShoppingListItemService);
    repository = module.get(ShoppingListItemRepository);
    pantryItemService = module.get<PantryItemService>(PantryItemService);
    userRepository = module.get<UserRepository>(UserRepository);

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
      unit: 'KG',
      notes: 'Test notes',
      checked: false,
      shoppingListId: 'list-1',
      foodId: 'food-1',
    };

    it('should create a shopping list item successfully', async () => {
      // Arrange
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      mockFoodRepository.findById.mockResolvedValue(mockFood);
      repository.findByShoppingListAndFood.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockShoppingListItem);

      // Act
      const result = await service.create(createDto, 'user-1');

      // Assert
      expect(mockShoppingListRepository.findById).toHaveBeenCalledWith(
        'list-1',
      );
      expect(mockFoodRepository.findById).toHaveBeenCalledWith('food-1');
      expect(repository.findByShoppingListAndFood).toHaveBeenCalledWith(
        'list-1',
        'food-1',
      );
      expect(repository.create).toHaveBeenCalledWith(createDto);

      expect(result.id).toBe('1');
      expect(result.quantity).toBe(2);
    });

    it('should throw NotFoundException if shopping list not found', async () => {
      // Arrange
      mockShoppingListRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );

      // Stelle sicher, dass nachfolgende Schritte nicht ausgeführt werden
      expect(mockFoodRepository.findById).not.toHaveBeenCalled();
      expect(repository.findByShoppingListAndFood).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if food not found', async () => {
      // Arrange
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      mockFoodRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if item already exists', async () => {
      // Arrange
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      mockFoodRepository.findById.mockResolvedValue(mockFood);
      repository.findByShoppingListAndFood.mockResolvedValue(
        mockShoppingListItem,
      );

      // Act & Assert
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        ConflictException,
      );

      // Stelle sicher, dass create nicht aufgerufen wird, wenn Item bereits existiert
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on repository error', async () => {
      // Arrange
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      mockFoodRepository.findById.mockResolvedValue(mockFood);
      repository.findByShoppingListAndFood.mockResolvedValue(null);
      repository.create.mockRejectedValue(new Error('Database error'));

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
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      repository.findByShoppingListId.mockResolvedValue([mockShoppingListItem]);

      // Act
      const result = await service.findByShoppingList('list-1', 'user-1');

      // Assert
      expect(mockShoppingListRepository.findById).toHaveBeenCalledWith(
        'list-1',
      );
      expect(repository.findByShoppingListId).toHaveBeenCalledWith(
        'list-1',
        'user-1',
      );
      expect(result.data).toHaveLength(1);
    });

    it('should throw NotFoundException when shopping list not found', async () => {
      // Arrange
      mockShoppingListRepository.findById.mockResolvedValue(null);

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

  it('should toggle checked and create pantry item if user preference is true', async () => {
    repository.findById.mockResolvedValue(mockShoppingListItem);

    mockUserRepository.findById.mockResolvedValue(mockUser);
    repository.toggleChecked.mockResolvedValue(mockUpdatedItem);

    mockPantryItemService.createFromShoppingList.mockResolvedValue({
      id: 'pantry-item-1',
      quantity: 2,
      unit: 'KG',
      notes: 'Test notes',
      checked: false,
      shoppingListId: 'list-1',
      foodId: 'food-1',
      include: {
        shoppingList: true,
        food: true,
      },
    });

    const result = await service.toggleChecked('item-1', 'user-1');

    expect(repository.findById).toHaveBeenCalledWith('item-1');
    expect(userRepository.findById).toHaveBeenCalledWith('user-1');
    expect(repository.toggleChecked).toHaveBeenCalledWith('item-1');
    expect(pantryItemService.createFromShoppingList).toHaveBeenCalledWith(
      expect.objectContaining({
        foodId: mockShoppingListItem.foodId,
        quantity: mockShoppingListItem.quantity,
        unit: mockShoppingListItem.unit,
      }),
      'user-1',
    );
    expect(result).toBeDefined();
    expect(result.id).toBe('1');
  });

  it('should throw NotFoundException if user does not exist', async () => {
    repository.findById.mockResolvedValue(mockShoppingListItem);
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(service.toggleChecked('item-1', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.toggleChecked).not.toHaveBeenCalled();
    expect(pantryItemService.createFromShoppingList).not.toHaveBeenCalled();
  });

  it('should NOT create pantry item when unchecking (item is already checked)', async () => {
    const checkedItem = { ...mockShoppingListItem, checked: true };
    const uncheckedItem = { ...mockShoppingListItem, checked: false };

    repository.findById.mockResolvedValue(checkedItem);
    mockUserRepository.findById.mockResolvedValue(mockUser);
    repository.toggleChecked.mockResolvedValue(uncheckedItem);

    const result = await service.toggleChecked('item-1', 'user-1');

    expect(repository.findById).toHaveBeenCalledWith('item-1');
    expect(userRepository.findById).toHaveBeenCalledWith('user-1');
    expect(repository.toggleChecked).toHaveBeenCalledWith('item-1');
    expect(pantryItemService.createFromShoppingList).not.toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.id).toBe('1');
  });

  it('should NOT create pantry item when user preference is false', async () => {
    const userWithPreferenceFalse = {
      ...mockUser,
      checkedShoppingListItemInPantry: false,
    };

    repository.findById.mockResolvedValue(mockShoppingListItem);
    mockUserRepository.findById.mockResolvedValue(userWithPreferenceFalse);
    repository.toggleChecked.mockResolvedValue(mockUpdatedItem);

    const result = await service.toggleChecked('item-1', 'user-1');

    expect(repository.findById).toHaveBeenCalledWith('item-1');
    expect(userRepository.findById).toHaveBeenCalledWith('user-1');
    expect(repository.toggleChecked).toHaveBeenCalledWith('item-1');
    expect(pantryItemService.createFromShoppingList).not.toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.id).toBe('1');
  });

  it('should NOT create pantry item when user preference is null or undefined', async () => {
    const userWithPreferenceNull = {
      ...mockUser,
      checkedShoppingListItemInPantry: null,
    };

    repository.findById.mockResolvedValue(mockShoppingListItem);
    mockUserRepository.findById.mockResolvedValue(userWithPreferenceNull);
    repository.toggleChecked.mockResolvedValue(mockUpdatedItem);

    const result = await service.toggleChecked('item-1', 'user-1');

    expect(repository.findById).toHaveBeenCalledWith('item-1');
    expect(userRepository.findById).toHaveBeenCalledWith('user-1');
    expect(repository.toggleChecked).toHaveBeenCalledWith('item-1');
    expect(pantryItemService.createFromShoppingList).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should handle pantry creation failure gracefully', async () => {
    repository.findById.mockResolvedValue(mockShoppingListItem);
    mockUserRepository.findById.mockResolvedValue(mockUser);
    repository.toggleChecked.mockResolvedValue(mockUpdatedItem);
    mockPantryItemService.createFromShoppingList.mockRejectedValue(
      new Error('Pantry creation failed'),
    );

    // Should not throw, toggle should succeed even if pantry creation fails
    const result = await service.toggleChecked('item-1', 'user-1');

    expect(repository.findById).toHaveBeenCalledWith('item-1');
    expect(userRepository.findById).toHaveBeenCalledWith('user-1');
    expect(repository.toggleChecked).toHaveBeenCalledWith('item-1');
    expect(pantryItemService.createFromShoppingList).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.id).toBe('1');
  });
});
